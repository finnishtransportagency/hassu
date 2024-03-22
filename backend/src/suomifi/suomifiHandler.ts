import { SQSEvent } from "aws-lambda";
import { setupLambdaMonitoring, wrapXRayAsync } from "../aws/monitoring";
import { auditLog, log } from "../logger";
import { PdfViesti, SuomiFiClient, Viesti, getSuomiFiClient } from "./viranomaispalvelutwsinterface/suomifi";
import { parameters } from "../aws/parameters";
import { getDynamoDBDocumentClient } from "../aws/client";
import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { getMuistuttajaTableName, getKiinteistonomistajaTableName } from "../util/environment";
import { muistutusEmailService } from "../muistutus/muistutusEmailService";
import { projektiDatabase } from "../database/projektiDatabase";
import { isValidEmail } from "../email/emailUtil";
import { createKuittausMuistuttajalleEmail } from "../email/emailTemplates";
import { AsiakirjaTyyppi, Kieli } from "hassu-common/graphql/apiModel";
import {
  DBProjekti,
  HyvaksymisPaatosVaihePDF,
  KasittelynTila,
  LocalizedMap,
  Muistutus,
  NahtavillaoloPDF,
  SuunnitteluSopimus,
} from "../database/model";
import { getSQS } from "../aws/clients/getSQS";
import { SendMessageBatchRequestEntry } from "@aws-sdk/client-sqs";
import { fileService } from "../files/fileService";
import { PublishOrExpireEventType } from "../sqsEvents/projektiScheduleManager";
import { FULL_DATE_TIME_FORMAT_WITH_TZ, nyt } from "../util/dateUtil";
import { config } from "../config";
import { createPDFFileName } from "../asiakirja/pdfFileName";
import { EnhancedPDF, determineAsiakirjaMuoto } from "../asiakirja/asiakirjaTypes";
import { GeneratePDFEvent } from "../asiakirja/lambda/generatePDFEvent";
import { invokeLambda } from "../aws/lambda";
import PdfMerger from "pdf-merger-js";
import { convertPdfFileName } from "../asiakirja/asiakirjaUtil";
import { DBOmistaja, omistajaDatabase } from "../database/omistajaDatabase";
import { translate } from "../util/localization";
import { chunkArray } from "../database/chunkArray";
import { DBMuistuttaja, muistuttajaDatabase } from "../database/muistuttajaDatabase";
import { Asiakas1 } from "./viranomaispalvelutwsinterface";

export type SuomiFiSanoma = {
  oid: string;
  muistuttajaId?: string;
  omistajaId?: string;
  tyyppi?: PublishOrExpireEventType;
};

type Kohde = {
  id: string;
  nimi: string;
  lahiosoite: string;
  postinumero: string;
  postitoimipaikka: string;
  maakoodi: string;
  hetu?: string;
  ytunnus?: string;
};

let mockSuomiFiClient: SuomiFiClient | undefined;

export function setMockSuomiFiClient(client: SuomiFiClient) {
  mockSuomiFiClient = client;
}

export function parseLaskutus(tunniste?: string) {
  if (tunniste) {
    const parsedTunniste: Record<string, string> = {};
    const tunnisteet = tunniste.split(",");
    for (let i = 0; i < tunnisteet.length; i++) {
      const keyValue = tunnisteet[i].split(":");
      if (keyValue.length === 2) {
        parsedTunniste[keyValue[0].trim()] = keyValue[1].trim();
      }
    }
    return parsedTunniste;
  }
  return {};
}

async function getClient(): Promise<SuomiFiClient> {
  if (config.isInTest) {
    if (!mockSuomiFiClient) {
      throw new Error("Suomi.fi clientia ei ole asetettu");
    }
    return mockSuomiFiClient;
  }
  // luodaan client aina uudestaan kun muuten viestin allekirjoituksen verifiointi epäonnistuu
  const now = Date.now();
  const cfg = await parameters.getSuomiFiConfig();
  try {
    return await getSuomiFiClient({
      apiKey: cfg.apikey,
      endpoint: cfg.endpoint,
      palveluTunnus: cfg.palvelutunnus,
      viranomaisTunnus: cfg.viranomaistunnus,
      laskutusTunniste: parseLaskutus(cfg.laskutustunniste),
      laskutusSalasana: parseLaskutus(cfg.laskutussalasana),
      publicCertificate: await parameters.getSuomiFiCertificate(),
      privateKey: await parameters.getSuomiFiPrivateKey(),
    });
  } finally {
    log.info(`Suomi.fi client alustusaika: ${Date.now() - now} ms`);
  }
}

function createMuistutus(muistuttaja: DBMuistuttaja): Muistutus {
  return {
    id: muistuttaja.id,
    vastaanotettu: muistuttaja.vastaanotettu!,
    etunimi: muistuttaja.etunimi,
    sukunimi: muistuttaja.sukunimi,
    katuosoite: muistuttaja.lahiosoite,
    muistutus: muistuttaja.muistutus,
    postitoimipaikka: muistuttaja.postitoimipaikka,
    postinumero: muistuttaja.postinumero,
    sahkoposti: muistuttaja.sahkoposti,
    liitteet: muistuttaja.liitteet,
  };
}

async function haeAsiakasTiedot(hetu: string): Promise<Asiakas1 | undefined> {
  const client = await getClient();
  const response = await client.haeAsiakas(hetu, "SSN");
  return response.HaeAsiakkaitaResult?.Asiakkaat?.Asiakas?.find((a) => a.attributes.AsiakasTunnus === hetu);
}

async function isCognitoKayttajaSuomiFiViestitEnabled(hetu: string): Promise<boolean> {
  const asiakas = await haeAsiakasTiedot(hetu);
  return asiakas?.Tila === 300;
}

async function isMuistuttajaSuomiFiViestitEnabled(hetu: string, muistuttajaId: string): Promise<boolean> {
  const asiakas = await haeAsiakasTiedot(hetu);
  auditLog.info("Suomi.fi viestit tila", { muistuttajaId, tila: asiakas?.Tila });
  return asiakas?.Tila === 300;
}

async function lahetaInfoViesti(hetu: string, projektiFromDB: DBProjekti, muistuttaja: DBMuistuttaja) {
  const client = await getClient();
  const emailOptions = createKuittausMuistuttajalleEmail(projektiFromDB, createMuistutus(muistuttaja));
  const viesti: Viesti = {
    otsikko: emailOptions.subject as string,
    sisalto: emailOptions.text as string,
    hetu,
  };
  const resp = await client.lahetaInfoViesti(viesti);
  const kohde = resp.LisaaKohteitaResult?.Kohteet?.Kohde?.find((k) => k.Asiakas?.some((a) => a.attributes.AsiakasTunnus === hetu));
  const asiakas = kohde?.Asiakas?.find((a) => a.attributes.AsiakasTunnus === hetu);
  const success = resp.LisaaKohteitaResult?.TilaKoodi?.TilaKoodi === 0 && asiakas?.KohteenTila === 200;
  if (success) {
    auditLog.info("Suomi.fi infoviesti lähetetty muistuttajalle", {
      muistuttajaId: muistuttaja.id,
      sanomaTunniste: resp.LisaaKohteitaResult?.TilaKoodi?.SanomaTunniste,
    });
  } else {
    auditLog.info("Suomi.fi infoviestin lähetys muistuttajalle epäonnistui", {
      muistuttajaId: muistuttaja.id,
      sanomaTunniste: resp.LisaaKohteitaResult?.TilaKoodi?.SanomaTunniste,
      tilaKoodi: resp.LisaaKohteitaResult?.TilaKoodi?.TilaKoodi,
      kohteenTila: asiakas?.KohteenTila,
    });
    throw new Error("Suomi.fi infoviestin lähetys muistuttajalle epäonnistui");
  }
}

async function paivitaLahetysStatus(oid: string, id: string, omistaja: boolean, success: boolean, approvalType: PublishOrExpireEventType) {
  const params = new UpdateCommand({
    TableName: omistaja ? getKiinteistonomistajaTableName() : getMuistuttajaTableName(),
    Key: {
      id,
      oid,
    },
    UpdateExpression: "SET #l = list_append(if_not_exists(#l, :tyhjalista), :status)",
    ExpressionAttributeNames: { "#l": "lahetykset" },
    ExpressionAttributeValues: {
      ":status": [{ tila: success ? "OK" : "VIRHE", lahetysaika: nyt().format(FULL_DATE_TIME_FORMAT_WITH_TZ), tyyppi: approvalType }],
      ":tyhjalista": [],
    },
  });
  try {
    await getDynamoDBDocumentClient().send(params);
  } catch (e) {
    log.error("Lähetyksen statuksen lisäys epäonnistui: " + e, {
      muistuttajaId: omistaja ? undefined : id,
      omistajaId: omistaja ? id : undefined,
    });
  }
}

type GeneratedPdf = {
  file: Buffer;
  tiedostoNimi: string;
};

function createGenerateEvent(
  tyyppi: PublishOrExpireEventType,
  asiakirjaTyyppi: AsiakirjaTyyppi,
  projektiFromDB: DBProjekti,
  kohde: Kohde
): GeneratePDFEvent | undefined {
  if (
    asiakirjaTyyppi === AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KIINTEISTOJEN_OMISTAJILLE &&
    tyyppi === PublishOrExpireEventType.PUBLISH_NAHTAVILLAOLO &&
    projektiFromDB.nahtavillaoloVaiheJulkaisut
  ) {
    return {
      createNahtavillaoloKuulutusPdf: {
        asiakirjaTyyppi,
        asianhallintaPaalla: !(projektiFromDB.asianhallinta?.inaktiivinen ?? true),
        kayttoOikeudet: projektiFromDB.kayttoOikeudet,
        kieli: Kieli.SUOMI,
        linkkiAsianhallintaan: undefined,
        luonnos: false,
        lyhytOsoite: projektiFromDB.lyhytOsoite,
        nahtavillaoloVaihe: projektiFromDB.nahtavillaoloVaiheJulkaisut[projektiFromDB.nahtavillaoloVaiheJulkaisut.length - 1],
        oid: projektiFromDB.oid,
        velho: projektiFromDB.velho!,
        vahainenMenettely: projektiFromDB.vahainenMenettely,
        euRahoitusLogot: projektiFromDB.euRahoitusLogot,
        suunnitteluSopimus: projektiFromDB.suunnitteluSopimus as SuunnitteluSopimus | undefined,
        osoite: {
          nimi: kohde.nimi,
          katuosoite: kohde.lahiosoite,
          postinumero: kohde.postinumero,
          postitoimipaikka: kohde.postitoimipaikka,
        },
      },
    };
  } else if (
    asiakirjaTyyppi === AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_MUISTUTTAJILLE &&
    tyyppi === PublishOrExpireEventType.PUBLISH_HYVAKSYMISPAATOSVAIHE &&
    projektiFromDB.hyvaksymisPaatosVaiheJulkaisut
  ) {
    return {
      createHyvaksymisPaatosKuulutusPdf: {
        asiakirjaTyyppi,
        asianhallintaPaalla: !(projektiFromDB.asianhallinta?.inaktiivinen ?? true),
        kayttoOikeudet: projektiFromDB.kayttoOikeudet,
        kieli: Kieli.SUOMI,
        linkkiAsianhallintaan: undefined,
        luonnos: false,
        lyhytOsoite: projektiFromDB.lyhytOsoite,
        hyvaksymisPaatosVaihe: projektiFromDB.hyvaksymisPaatosVaiheJulkaisut[projektiFromDB.hyvaksymisPaatosVaiheJulkaisut.length - 1],
        oid: projektiFromDB.oid,
        euRahoitusLogot: projektiFromDB.euRahoitusLogot,
        osoite: {
          nimi: kohde.nimi,
          katuosoite: kohde.lahiosoite,
          postinumero: kohde.postinumero,
          postitoimipaikka: kohde.postitoimipaikka,
        },
        kasittelynTila: projektiFromDB.kasittelynTila as KasittelynTila,
      },
    };
  }
}

export async function generatePdf(
  projektiFromDB: DBProjekti,
  tyyppi: PublishOrExpireEventType,
  kohde: Kohde
): Promise<GeneratedPdf | undefined> {
  let vaihe: LocalizedMap<HyvaksymisPaatosVaihePDF | NahtavillaoloPDF> | undefined;
  let asiakirjaTyyppi;
  if (tyyppi === PublishOrExpireEventType.PUBLISH_NAHTAVILLAOLO && projektiFromDB.nahtavillaoloVaiheJulkaisut) {
    vaihe = projektiFromDB.nahtavillaoloVaiheJulkaisut[projektiFromDB.nahtavillaoloVaiheJulkaisut.length - 1].nahtavillaoloPDFt;
    asiakirjaTyyppi = AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KIINTEISTOJEN_OMISTAJILLE;
  } else if (tyyppi === PublishOrExpireEventType.PUBLISH_HYVAKSYMISPAATOSVAIHE && projektiFromDB.hyvaksymisPaatosVaiheJulkaisut) {
    vaihe =
      projektiFromDB.hyvaksymisPaatosVaiheJulkaisut[projektiFromDB.hyvaksymisPaatosVaiheJulkaisut.length - 1].hyvaksymisPaatosVaihePDFt;
    asiakirjaTyyppi = AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_MUISTUTTAJILLE;
  } else {
    log.error("Väärä vaiheen tyyppi " + tyyppi + " tai julkaisu puuttuu, kiinteistön omistajia/muistuttajia ei tiedoteta");
    return;
  }
  try {
    const files: Buffer[] = [];
    const result = await invokeLambda(
      config.pdfGeneratorLambdaArn,
      true,
      JSON.stringify(createGenerateEvent(tyyppi, asiakirjaTyyppi, projektiFromDB, kohde))
    );
    const response = JSON.parse(result!) as EnhancedPDF;
    files.push(Buffer.from(response.sisalto, "base64"));
    const vaylamuoto = determineAsiakirjaMuoto(projektiFromDB.velho?.tyyppi, projektiFromDB.velho?.vaylamuoto);
    const tiedostoNimi = createPDFFileName(asiakirjaTyyppi, vaylamuoto, projektiFromDB.velho?.tyyppi, Kieli.SUOMI);
    if (vaihe?.[Kieli.RUOTSI]) {
      let tiedosto;
      if ("hyvaksymisIlmoitusMuistuttajillePDFPath" in vaihe[Kieli.RUOTSI]) {
        tiedosto = vaihe[Kieli.RUOTSI].hyvaksymisIlmoitusMuistuttajillePDFPath;
      } else if ("nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath" in vaihe[Kieli.RUOTSI]) {
        tiedosto = vaihe[Kieli.RUOTSI].nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath;
      }
      log.info("Haetaan tiedosto " + tiedosto);
      if (tiedosto) {
        files.push(await fileService.getProjektiFile(projektiFromDB.oid, tiedosto));
      }
    }
    const merger = new PdfMerger();
    for (const file of files) {
      await merger.add(file);
    }
    merger.setMetadata({ creator: "VLS", producer: "Valtion liikenneväylien suunnittelu", title: tiedostoNimi });
    return {
      file: await merger.saveAsBuffer(),
      tiedostoNimi,
    };
  } catch (e) {
    log.error(e);
    throw new Error("PDF generointi epäonnistui");
  }
}

async function lahetaPdfViesti(projektiFromDB: DBProjekti, kohde: Kohde, omistaja: boolean, tyyppi: PublishOrExpireEventType) {
  try {
    const pdf = await generatePdf(projektiFromDB, tyyppi, kohde);
    if (!pdf) {
      return;
    }
    const otsikko =
      tyyppi === PublishOrExpireEventType.PUBLISH_NAHTAVILLAOLO
        ? "Ilmoitus suunnitelman nähtäville asettamisesta"
        : "Ilmoitus suunnitelman hyväksymispäätöksestä";
    const sisaltoNahtavillaolo = `Hei,

Olette saaneet kirjeen, jossa kerrotaan suunnitelman nähtäville asettamista sekä mahdollisuudesta tehdä suunnitelmasta muistutus. Kirje on tämän viestin liitteenä. Löydät kirjeestä linkin Valtion liikenneväylien suunnittelu -palveluun, missä pääsette tutustumaan suunnitelmaan tarkemmin.

Ystävällisin terveisin
${translate("viranomainen." + projektiFromDB.velho?.suunnittelustaVastaavaViranomainen, Kieli.SUOMI)}`;
    const sisaltoHyvaksymispaatos = `Hei,

Olette saaneet kirjeen, jossa kerrotaan suunnitelmaa koskevasta hyväksymispäätöksestä. Kirje on tämän viestin liitteenä. Löydät kirjeestä linkin Valtion liikenneväylien suunnittelu -palveluun, missä pääsette tutustumaan tarkemmin päätökseen ja sen liitteenä oleviin suunnitelma-aineistoihin.

Ystävällisin terveisin
${translate("viranomainen." + projektiFromDB.velho?.suunnittelustaVastaavaViranomainen, Kieli.SUOMI)}`;
    const viesti: PdfViesti = {
      nimi: kohde.nimi,
      otsikko,
      sisalto: tyyppi === PublishOrExpireEventType.PUBLISH_NAHTAVILLAOLO ? sisaltoNahtavillaolo : sisaltoHyvaksymispaatos,
      lahiosoite: kohde.lahiosoite,
      postinumero: kohde.postinumero,
      postitoimipaikka: kohde.postitoimipaikka,
      maa: kohde.maakoodi,
      hetu: kohde.hetu,
      ytunnus: kohde.ytunnus,
      tiedosto: {
        kuvaus: pdf.tiedostoNimi,
        nimi: convertPdfFileName(pdf.tiedostoNimi),
        sisalto: pdf.file,
      },
      suunnittelustaVastaavaViranomainen: projektiFromDB.velho?.suunnittelustaVastaavaViranomainen,
    };
    const client = await getClient();
    const resp = await client.lahetaViesti(viesti);
    const success = resp.LahetaViestiResult?.TilaKoodi?.TilaKoodi === 202;
    if (success) {
      auditLog.info("Suomi.fi pdf-viesti lähetetty", {
        omistajaId: omistaja ? kohde.id : undefined,
        muistuttajaId: omistaja ? undefined : kohde.id,
        sanomaTunniste: resp.LahetaViestiResult?.TilaKoodi?.SanomaTunniste,
      });
      await paivitaLahetysStatus(projektiFromDB.oid, kohde.id, omistaja, true, tyyppi);
    } else {
      auditLog.info("Suomi.fi pdf-viestin lähetys epäonnistui", {
        omistajaId: omistaja ? kohde.id : undefined,
        muistuttajaId: omistaja ? undefined : kohde.id,
        sanomaTunniste: resp.LahetaViestiResult?.TilaKoodi?.SanomaTunniste,
        tilaKoodi: resp.LahetaViestiResult?.TilaKoodi?.TilaKoodi,
      });
      throw new Error("Suomi.fi pdf-viestin lähetys epäonnistui");
    }
  } catch (e) {
    await paivitaLahetysStatus(projektiFromDB.oid, kohde.id, omistaja, false, tyyppi);
    throw e;
  }
}

function isOmistajanTiedotOk(kohde: DBOmistaja): boolean {
  return (
    (!!kohde.henkilotunnus || !!kohde.ytunnus) &&
    (!!kohde.nimi || (!!kohde.etunimet && !!kohde.sukunimi)) &&
    !!kohde.jakeluosoite &&
    !!kohde.paikkakunta &&
    !!kohde.postinumero
  );
}

function isMuistuttujanTiedotOk(kohde: DBMuistuttaja): boolean {
  return (
    !!kohde.henkilotunnus && !!kohde.etunimi && !!kohde.sukunimi && !!kohde.lahiosoite && !!kohde.postitoimipaikka && !!kohde.postinumero
  );
}

async function lahetaViesti(muistuttaja: DBMuistuttaja, projektiFromDB: DBProjekti) {
  if (
    (await parameters.isSuomiFiIntegrationEnabled()) &&
    (await parameters.isSuomiFiViestitIntegrationEnabled()) &&
    muistuttaja.henkilotunnus &&
    (await isMuistuttajaSuomiFiViestitEnabled(muistuttaja.henkilotunnus, muistuttaja.id))
  ) {
    await lahetaInfoViesti(muistuttaja.henkilotunnus, projektiFromDB, muistuttaja);
  } else if (muistuttaja.sahkoposti && isValidEmail(muistuttaja.sahkoposti)) {
    await muistutusEmailService.sendEmailToMuistuttaja(projektiFromDB, createMuistutus(muistuttaja));
    auditLog.info("Muistuttajalle lähetetty sähköposti", { muistuttajaId: muistuttaja.id });
  } else {
    log.error(
      "Muistuttajalle ei voitu lähettää kuittausviestiä: " + (muistuttaja.sahkoposti ? muistuttaja.sahkoposti : "ei sähköpostiosoitetta")
    );
  }
}

type DBKohde = {
  kohde: DBMuistuttaja | DBOmistaja;
  projekti: DBProjekti;
};

async function getKohde(oid: string, id: string, omistaja: boolean): Promise<DBKohde | undefined> {
  const dbResponse = await getDynamoDBDocumentClient().send(
    new GetCommand({ TableName: omistaja ? getKiinteistonomistajaTableName() : getMuistuttajaTableName(), Key: { id, oid } })
  );
  const kohde = dbResponse.Item as DBMuistuttaja | DBOmistaja | undefined;
  if (!kohde) {
    log.error(`${omistaja ? "Omistajaa" : "Muistuttajaa"} ${id} ei löydy`);
    return;
  }
  const projekti = await projektiDatabase.loadProjektiByOid(kohde.oid);
  if (!projekti) {
    log.error("Projektia " + kohde.oid + " ei löydy");
    return;
  }
  return { kohde, projekti };
}

async function handleMuistuttaja(oid: string, muistuttajaId: string, tyyppi?: PublishOrExpireEventType) {
  const kohde = await getKohde(oid, muistuttajaId, false);
  if (!kohde) {
    return;
  }
  const muistuttaja = kohde.kohde as DBMuistuttaja;
  if (tyyppi === undefined) {
    await lahetaViesti(muistuttaja, kohde.projekti);
  } else if (isMuistuttujanTiedotOk(muistuttaja)) {
    await lahetaPdfViesti(
      kohde.projekti,
      {
        id: muistuttaja.id,
        nimi: `${muistuttaja.etunimi} ${muistuttaja.sukunimi}`,
        lahiosoite: muistuttaja.lahiosoite!,
        postinumero: muistuttaja.postinumero!,
        postitoimipaikka: muistuttaja.postitoimipaikka!,
        hetu: muistuttaja.henkilotunnus!,
        maakoodi: muistuttaja.maakoodi ? muistuttaja.maakoodi : "FI",
      },
      false,
      tyyppi
    );
  } else {
    auditLog.info("Muistuttajalta puuttuu pakollisia tietoja", { muistuttajaId: muistuttaja.id });
    await paivitaLahetysStatus(muistuttaja.oid, muistuttaja.id, false, false, tyyppi);
  }
}

async function handleOmistaja(oid: string, omistajaId: string, tyyppi: PublishOrExpireEventType) {
  const kohde = await getKohde(oid, omistajaId, true);
  if (!kohde) {
    return;
  }
  const omistaja = kohde.kohde as DBOmistaja;
  if (isOmistajanTiedotOk(omistaja)) {
    await lahetaPdfViesti(
      kohde.projekti,
      {
        id: omistaja.id,
        nimi: omistaja.nimi ? omistaja.nimi : `${omistaja.etunimet?.split(" ")[0]} ${omistaja.sukunimi}`,
        lahiosoite: omistaja.jakeluosoite!,
        postinumero: omistaja.postinumero!,
        postitoimipaikka: omistaja.paikkakunta!,
        hetu: omistaja.henkilotunnus,
        ytunnus: omistaja.ytunnus,
        maakoodi: omistaja.maakoodi ? omistaja.maakoodi : "FI",
      },
      true,
      tyyppi
    );
  } else {
    auditLog.info("Omistajalta puuttuu pakollisia tietoja", { omistajaId: omistaja.id });
    await paivitaLahetysStatus(omistaja.oid, omistaja.id, true, false, tyyppi);
  }
}

const handlerFactory = (event: SuomifiEvent) => async () => {
  if (isEventStatusCheckAction(event)) {
    return await isCognitoKayttajaSuomiFiViestitEnabled(event.hetu);
  }
  if (isEventSqsEvent(event)) {
    await handleSqsEvent(event);
  } else {
    throw new Error("Unknown event:" + JSON.stringify(event));
  }
};

async function handleSqsEvent(event: SQSEvent) {
  log.info("SQS sanomien määrä " + event.Records.length);
  for (const record of event.Records) {
    try {
      const msg = JSON.parse(record.body) as SuomiFiSanoma;
      log.info("Suomi.fi sanoma", { sanoma: msg });
      if (msg.omistajaId && msg.tyyppi) {
        await handleOmistaja(msg.oid, msg.omistajaId, msg.tyyppi);
      } else if (msg.muistuttajaId) {
        await handleMuistuttaja(msg.oid, msg.muistuttajaId, msg.tyyppi);
      } else {
        log.error("Suomi.fi sanoma virheellinen", { sanoma: msg });
      }
    } catch (e) {
      log.error("Suomi.fi viestin käsittely epäonnistui: " + e);
      throw e;
    }
  }
}

function isEventStatusCheckAction(event: SuomifiEvent): event is SuomiFiViestitStatusCheckAction {
  return !!(event as SuomiFiViestitStatusCheckAction).hetu;
}

function isEventSqsEvent(event: SuomifiEvent): event is SQSEvent {
  const records = (event as SQSEvent).Records;
  return !!records.length && records.every((record) => record.body);
}

type SuomiFiViestitStatusCheckAction = {
  hetu: string;
};

type SuomifiEvent = SuomiFiViestitStatusCheckAction | SQSEvent;

export const handleEvent = async (event: SuomifiEvent) => {
  setupLambdaMonitoring();
  await wrapXRayAsync("handler", handlerFactory(event));
};

async function haeUniqueKiinteistonOmistajaIds(projektiFromDB: DBProjekti, uniqueIds: Map<string, string>) {
  const dbOmistajat = await omistajaDatabase.haeProjektinKaytossaolevatOmistajat(projektiFromDB.oid);
  for (const omistaja of dbOmistajat.filter((o) => o.suomifiLahetys)) {
    if (omistaja.henkilotunnus && !uniqueIds.has(omistaja.henkilotunnus)) {
      uniqueIds.set(omistaja.henkilotunnus, omistaja.id);
    } else if (omistaja.ytunnus && !uniqueIds.has(omistaja.ytunnus)) {
      uniqueIds.set(omistaja.ytunnus, omistaja.id);
    }
  }
  return [...uniqueIds.values()];
}

async function haeUniqueMuistuttajaIds(projektiFromDB: DBProjekti, uniqueIds: Map<string, string>) {
  const dbMuistuttajat = await muistuttajaDatabase.haeProjektinMuistuttajat(projektiFromDB.oid);
  const newIds: string[] = [];
  for (const muistuttaja of dbMuistuttajat.filter((m) => m.suomifiLahetys)) {
    if (muistuttaja.henkilotunnus && !uniqueIds.has(muistuttaja.henkilotunnus)) {
      uniqueIds.set(muistuttaja.henkilotunnus, muistuttaja.id);
      newIds.push(muistuttaja.id);
    }
  }
  return newIds;
}

export async function lahetaSuomiFiViestit(projektiFromDB: DBProjekti, tyyppi: PublishOrExpireEventType) {
  if ((await parameters.isSuomiFiIntegrationEnabled()) && (await parameters.isSuomiFiViestitIntegrationEnabled())) {
    const viestit: SendMessageBatchRequestEntry[] = [];
    const uniqueIds: Map<string, string> = new Map();
    (await haeUniqueKiinteistonOmistajaIds(projektiFromDB, uniqueIds)).forEach((id) => {
      const msg: SuomiFiSanoma = { omistajaId: id, tyyppi, oid: projektiFromDB.oid };
      viestit.push({ Id: id, MessageBody: JSON.stringify(msg) });
    });
    if (tyyppi === PublishOrExpireEventType.PUBLISH_HYVAKSYMISPAATOSVAIHE) {
      (await haeUniqueMuistuttajaIds(projektiFromDB, uniqueIds)).forEach((id) => {
        const msg: SuomiFiSanoma = { muistuttajaId: id, tyyppi, oid: projektiFromDB.oid };
        viestit.push({ Id: id, MessageBody: JSON.stringify(msg) });
      });
    }
    if (viestit.length > 0) {
      for (const viestitChunk of chunkArray(viestit, 10)) {
        const response = await getSQS().sendMessageBatch({ QueueUrl: await parameters.getSuomiFiSQSUrl(), Entries: viestitChunk });
        response.Failed?.forEach((v) => {
          if (projektiFromDB.omistajat?.includes(v.Id!)) {
            auditLog.error("SuomiFi SQS sanoman lähetys epäonnistui", { omistajaId: v.Id, message: v.Message, code: v.Code });
          } else {
            auditLog.error("SuomiFi SQS sanoman lähetys epäonnistui", { muistuttajaId: v.Id, message: v.Message, code: v.Code });
          }
        });
        response.Successful?.forEach((v) => {
          if (projektiFromDB.omistajat?.includes(v.Id!)) {
            auditLog.info("SuomiFi SQS sanoman lähetys onnistui", { omistajaId: v.Id });
          } else {
            auditLog.info("SuomiFi SQS sanoman lähetys onnistui", { muistuttajaId: v.Id });
          }
        });
      }
    } else {
      log.info("Projektilla ei ole Suomi.fi tiedotettavia omistajia tai muistuttajia");
    }
  } else {
    log.info("Suomi.fi integraatio ei ole päällä, ei tiedoteta kiinteistön omistajia ja muistuttajia");
  }
}
