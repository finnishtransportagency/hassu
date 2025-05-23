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
import { AsiakirjaTyyppi, Kieli, TiedotettavanLahetyksenTila } from "hassu-common/graphql/apiModel";
import { DBProjekti, KasittelynTila, Muistutus, SuunnitteluSopimus } from "../database/model";
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
import { Readable } from "stream";
import { streamToBuffer } from "../util/streamUtil";
import { haeKuulutettuYhdessaSuunnitelmanimi } from "../asiakirja/haeKuulutettuYhdessaSuunnitelmanimi";

export type SuomiFiSanoma = {
  oid: string;
  muistuttajaId?: string;
  omistajaId?: string;
  tyyppi?: PublishOrExpireEventType;
  muistuttajaIdsForLahetystilaUpdate?: string[];
  omistajaIdsForLahetystilaUpdate?: string[];
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
      yhteysHenkilo: cfg.yhteyshenkilo,
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

type PaivitaLahetysStatusParameters = {
  oid: string;
  id: string;
  omistaja: boolean;
  tila: TiedotettavanLahetyksenTila.OK | TiedotettavanLahetyksenTila.VIRHE;
  approvalType: PublishOrExpireEventType;
  traceId?: string;
  muistuttajaIdsForLahetystilaUpdate: string[] | undefined;
  omistajaIdsForLahetystilaUpdate: string[] | undefined;
};

async function paivitaTiedotettavanLahetysStatukset(params: PaivitaLahetysStatusParameters) {
  const { muistuttajaIdsForLahetystilaUpdate, omistajaIdsForLahetystilaUpdate, tila, id, omistaja, ...commonParams } = params;
  const lahetysaika = nyt().format(FULL_DATE_TIME_FORMAT_WITH_TZ);
  await paivitaLahetysStatus({ ...commonParams, id, omistaja, lahetysaika, tila });
  const tilaForOtherEntities =
    tila === "OK" ? TiedotettavanLahetyksenTila.OK_ERI_KIINTEISTO_MUISTUTUS : TiedotettavanLahetyksenTila.VIRHE_ERI_KIINTEISTO_MUISTUTUS;
  if (muistuttajaIdsForLahetystilaUpdate) {
    await Promise.all(
      muistuttajaIdsForLahetystilaUpdate.map((muistuttajaId) =>
        paivitaLahetysStatus({
          ...commonParams,
          omistaja: false,
          tila: tilaForOtherEntities,
          id: muistuttajaId,
          lahetysaika,
        })
      )
    );
  }
  if (omistajaIdsForLahetystilaUpdate) {
    await Promise.all(
      omistajaIdsForLahetystilaUpdate.map((omistajaId) =>
        paivitaLahetysStatus({
          ...commonParams,
          omistaja: true,
          tila: tilaForOtherEntities,
          id: omistajaId,
          lahetysaika,
        })
      )
    );
  }
}

type PaivitaLahetysStatusParameter = {
  oid: string;
  id: string;
  omistaja: boolean;
  tila: TiedotettavanLahetyksenTila;
  approvalType: PublishOrExpireEventType;
  lahetysaika: string;
  traceId?: string;
};

async function paivitaLahetysStatus({ oid, id, omistaja, tila, approvalType, traceId, lahetysaika }: PaivitaLahetysStatusParameter) {
  const params = new UpdateCommand({
    TableName: omistaja ? getKiinteistonomistajaTableName() : getMuistuttajaTableName(),
    Key: {
      id,
      oid,
    },
    UpdateExpression: "SET #l = list_append(if_not_exists(#l, :tyhjalista), :status)",
    ExpressionAttributeNames: { "#l": "lahetykset" },
    ExpressionAttributeValues: {
      ":status": [{ tila, lahetysaika, tyyppi: approvalType, traceId }],
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
  kielet: Kieli[];
};

async function createGenerateEvent(
  tyyppi: PublishOrExpireEventType,
  asiakirjaTyyppi: AsiakirjaTyyppi,
  projektiFromDB: DBProjekti,
  kohde: Kohde
): Promise<GeneratePDFEvent | undefined> {
  if (
    asiakirjaTyyppi === AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KIINTEISTOJEN_OMISTAJILLE &&
    tyyppi === PublishOrExpireEventType.PUBLISH_NAHTAVILLAOLO &&
    projektiFromDB.nahtavillaoloVaiheJulkaisut
  ) {
    const julkaisu = projektiFromDB.nahtavillaoloVaiheJulkaisut[projektiFromDB.nahtavillaoloVaiheJulkaisut.length - 1];
    return {
      createNahtavillaoloKuulutusPdf: {
        asiakirjaTyyppi,
        kuulutettuYhdessaSuunnitelmanimi: await haeKuulutettuYhdessaSuunnitelmanimi(julkaisu.projektinJakautuminen, Kieli.SUOMI),
        asianhallintaPaalla: !(projektiFromDB.asianhallinta?.inaktiivinen ?? true),
        kayttoOikeudet: projektiFromDB.kayttoOikeudet,
        kieli: Kieli.SUOMI,
        linkkiAsianhallintaan: undefined,
        luonnos: false,
        lyhytOsoite: projektiFromDB.lyhytOsoite,
        nahtavillaoloVaihe: julkaisu,
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
    const julkaisu = projektiFromDB.hyvaksymisPaatosVaiheJulkaisut[projektiFromDB.hyvaksymisPaatosVaiheJulkaisut.length - 1];
    return {
      createHyvaksymisPaatosKuulutusPdf: {
        asiakirjaTyyppi,
        kuulutettuYhdessaSuunnitelmanimi: await haeKuulutettuYhdessaSuunnitelmanimi(julkaisu.projektinJakautuminen, Kieli.SUOMI),
        asianhallintaPaalla: !(projektiFromDB.asianhallinta?.inaktiivinen ?? true),
        kayttoOikeudet: projektiFromDB.kayttoOikeudet,
        kieli: Kieli.SUOMI,
        linkkiAsianhallintaan: undefined,
        luonnos: false,
        lyhytOsoite: projektiFromDB.lyhytOsoite,
        hyvaksymisPaatosVaihe: julkaisu,
        oid: projektiFromDB.oid,
        euRahoitusLogot: projektiFromDB.euRahoitusLogot,
        osoite: {
          nimi: kohde.nimi,
          katuosoite: kohde.lahiosoite,
          postinumero: kohde.postinumero,
          postitoimipaikka: kohde.postitoimipaikka,
        },
        kasittelynTila: projektiFromDB.kasittelynTila as KasittelynTila,
        suunnitteluSopimus: projektiFromDB.suunnitteluSopimus,
      },
    };
  }
}

export async function generatePdf(
  projektiFromDB: DBProjekti,
  tyyppi: PublishOrExpireEventType,
  kohde: Kohde
): Promise<GeneratedPdf | undefined> {
  const asiakirjaTyyppi = determineAsiakirjaTyyppi(tyyppi, projektiFromDB);
  if (!asiakirjaTyyppi) {
    log.error("Väärä vaiheen tyyppi " + tyyppi + " tai julkaisu puuttuu, kiinteistön omistajia/muistuttajia ei tiedoteta");
    return;
  }
  try {
    const merger = new PdfMerger();
    const { files, kielet } = await getFilesAndLanguages(tyyppi, asiakirjaTyyppi, projektiFromDB, kohde);
    for (const file of files) {
      await merger.add(file);
    }
    const vaylamuoto = determineAsiakirjaMuoto(projektiFromDB.velho?.tyyppi, projektiFromDB.velho?.vaylamuoto);
    const tiedostoNimi = createPDFFileName(asiakirjaTyyppi, vaylamuoto, projektiFromDB.velho?.tyyppi, Kieli.SUOMI);
    merger.setMetadata({ creator: "VLS", producer: "Valtion liikenneväylien suunnittelu", title: tiedostoNimi });
    return {
      file: await merger.saveAsBuffer(),
      tiedostoNimi,
      kielet,
    };
  } catch (e) {
    log.error(e);
    throw new Error("PDF generointi epäonnistui");
  }
}

async function getFilesAndLanguages(
  tyyppi: PublishOrExpireEventType,
  asiakirjaTyyppi: AsiakirjaTyyppi,
  projektiFromDB: DBProjekti,
  kohde: Kohde
): Promise<{ kielet: Kieli[]; files: Buffer[] }> {
  const allFilesWithLanguages: { kieli: Kieli; buffer: Buffer | undefined }[] = [
    { kieli: Kieli.SUOMI, buffer: await getFinnishFileAsBuffer(tyyppi, asiakirjaTyyppi, projektiFromDB, kohde) },
    { kieli: Kieli.RUOTSI, buffer: await getSwedishFileAsBuffer(asiakirjaTyyppi, projektiFromDB) },
    { kieli: Kieli.POHJOISSAAME, buffer: await getSamiFileAsBuffer(asiakirjaTyyppi, projektiFromDB) },
  ];
  const filesWithLanguages = allFilesWithLanguages.filter((file): file is { kieli: Kieli; buffer: Buffer } => file.buffer !== undefined);
  return { files: filesWithLanguages.map(({ buffer }) => buffer), kielet: filesWithLanguages.map(({ kieli }) => kieli) };
}

function determineAsiakirjaTyyppi(tyyppi: PublishOrExpireEventType, projektiFromDB: DBProjekti): AsiakirjaTyyppi | undefined {
  if (tyyppi === PublishOrExpireEventType.PUBLISH_NAHTAVILLAOLO && projektiFromDB.nahtavillaoloVaiheJulkaisut) {
    return AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KIINTEISTOJEN_OMISTAJILLE;
  } else if (tyyppi === PublishOrExpireEventType.PUBLISH_HYVAKSYMISPAATOSVAIHE && projektiFromDB.hyvaksymisPaatosVaiheJulkaisut) {
    return AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_MUISTUTTAJILLE;
  }
  return undefined;
}

async function getSwedishFileAsBuffer(asiakirjaTyyppi: AsiakirjaTyyppi, projektiFromDB: DBProjekti): Promise<Buffer | undefined> {
  let tiedosto: string | undefined;
  if (asiakirjaTyyppi === AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KIINTEISTOJEN_OMISTAJILLE) {
    const julkaisu = projektiFromDB.nahtavillaoloVaiheJulkaisut?.[projektiFromDB.nahtavillaoloVaiheJulkaisut?.length - 1];
    tiedosto = julkaisu?.nahtavillaoloPDFt?.RUOTSI?.nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath;
  } else if (asiakirjaTyyppi === AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_MUISTUTTAJILLE) {
    const julkaisu = projektiFromDB.hyvaksymisPaatosVaiheJulkaisut?.[projektiFromDB.hyvaksymisPaatosVaiheJulkaisut?.length - 1];
    tiedosto = julkaisu?.hyvaksymisPaatosVaihePDFt?.RUOTSI?.hyvaksymisIlmoitusMuistuttajillePDFPath;
  }
  if (!tiedosto) {
    return undefined;
  }
  log.info("Haetaan tiedosto " + tiedosto);
  return await fileService.getProjektiFile(projektiFromDB.oid, tiedosto);
}

async function getSamiFileAsBuffer(asiakirjaTyyppi: AsiakirjaTyyppi, projektiFromDB: DBProjekti): Promise<Buffer | undefined> {
  let tiedostopolku: string | undefined;
  if (asiakirjaTyyppi === AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KIINTEISTOJEN_OMISTAJILLE) {
    const julkaisu = projektiFromDB.nahtavillaoloVaiheJulkaisut?.[projektiFromDB.nahtavillaoloVaiheJulkaisut?.length - 1];
    tiedostopolku = julkaisu?.nahtavillaoloSaamePDFt?.POHJOISSAAME?.kirjeTiedotettavillePDF?.tiedosto;
  } else if (asiakirjaTyyppi === AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_MUISTUTTAJILLE) {
    const julkaisu = projektiFromDB.hyvaksymisPaatosVaiheJulkaisut?.[projektiFromDB.hyvaksymisPaatosVaiheJulkaisut?.length - 1];
    tiedostopolku = julkaisu?.hyvaksymisPaatosVaiheSaamePDFt?.POHJOISSAAME?.kirjeTiedotettavillePDF?.tiedosto;
  }
  if (!tiedostopolku) {
    return undefined;
  }
  log.info("Haetaan tiedosto " + tiedostopolku);
  const { Body, ContentType } = await fileService.getProjektiYllapitoS3Object(projektiFromDB.oid, tiedostopolku);
  if (ContentType !== "application/pdf" || !(Body instanceof Readable)) {
    log.warn(`Haettu tiedosto polusta '${tiedostopolku}' ei ollut oikeaa tyyppiä. Tyyppi:'${ContentType}'`);
    return undefined;
  }
  return await streamToBuffer(Body);
}

async function getFinnishFileAsBuffer(
  tyyppi: PublishOrExpireEventType,
  asiakirjaTyyppi: AsiakirjaTyyppi,
  projektiFromDB: DBProjekti,
  kohde: Kohde
) {
  const result = await invokeLambda(
    config.pdfGeneratorLambdaArn,
    true,
    JSON.stringify(await createGenerateEvent(tyyppi, asiakirjaTyyppi, projektiFromDB, kohde))
  );
  const response = JSON.parse(result!) as EnhancedPDF;
  return Buffer.from(response.sisalto, "base64");
}

function getSaateteksti(tyyppi: PublishOrExpireEventType, projektiFromDB: DBProjekti, kielet: Kieli[]) {
  if (tyyppi === PublishOrExpireEventType.PUBLISH_NAHTAVILLAOLO) {
    let sisalto = `Hei,

Olette saaneet kirjeen, jossa kerrotaan suunnitelman nähtäville asettamista sekä mahdollisuudesta tehdä suunnitelmasta muistutus. Kirje on tämän viestin liitteenä. Löydät kirjeestä linkin Valtion liikenneväylien suunnittelu -palveluun, missä pääsette tutustumaan suunnitelmaan tarkemmin.

Ystävällisin terveisin
${translate("viranomainen." + projektiFromDB.velho?.suunnittelustaVastaavaViranomainen, Kieli.SUOMI)}`;
    if (kielet.includes(Kieli.RUOTSI)) {
      sisalto += `

Hej,

Ni har fått ett brev med information om framläggandet av planen samt om möjligheten att göra en anmärkning på planen. Brevet finns som bilaga till detta meddelande. I brevet hittar du en länk till tjänsten Planering av statens trafikleder, där ni kan bekanta er närmare med planen.

Med vänlig hälsning
${translate("viranomainen." + projektiFromDB.velho?.suunnittelustaVastaavaViranomainen, Kieli.RUOTSI)}
`;
    }
    return {
      otsikko: `Ilmoitus suunnitelman nähtäville asettamisesta${
        kielet.includes(Kieli.RUOTSI) ? " / Meddelande om framläggande av planen" : ""
      }`,
      sisalto,
    };
  } else {
    let sisalto = `Hei,

Olette saaneet kirjeen, jossa kerrotaan suunnitelmaa koskevasta hyväksymispäätöksestä. Kirje on tämän viestin liitteenä. Löydät kirjeestä linkin Valtion liikenneväylien suunnittelu -palveluun, missä pääsette tutustumaan tarkemmin päätökseen ja sen liitteenä oleviin suunnitelma-aineistoihin.

Ystävällisin terveisin
${translate("viranomainen." + projektiFromDB.velho?.suunnittelustaVastaavaViranomainen, Kieli.SUOMI)}`;
    if (kielet.includes(Kieli.RUOTSI)) {
      sisalto += `

Hej,

Ni har fått ett brev med information om beslut om godkännande av planen. Brevet finns som bilaga till detta meddelande. I brevet hittar du en länk till tjänsten Planering av statens trafikleder, där ni kan bekanta er närmare med beslutet och det bifogade planeringsmaterialet.

Med vänlig hälsning
${translate("viranomainen." + projektiFromDB.velho?.suunnittelustaVastaavaViranomainen, Kieli.RUOTSI)}
`;
    }
    return {
      otsikko: `Ilmoitus suunnitelman hyväksymispäätöksestä${
        kielet.includes(Kieli.RUOTSI) ? " / Meddelande om beslut om godkännande av planen" : ""
      }`,
      sisalto,
    };
  }
}

export function parseTraceId(text: string | undefined) {
  if (!text) {
    return undefined;
  }
  const traceId = "Trace ID: ";
  const idx = text.indexOf(traceId);
  return text.substring(idx + traceId.length);
}

type LahetaPdfViestiParameters = {
  projektiFromDB: DBProjekti;
  kohde: Kohde;
  omistaja: boolean;
  tyyppi: PublishOrExpireEventType;
  muistuttajaIdsForLahetystilaUpdate: string[] | undefined;
  omistajaIdsForLahetystilaUpdate: string[] | undefined;
};

async function lahetaPdfViesti({
  projektiFromDB,
  kohde,
  omistaja,
  tyyppi,
  muistuttajaIdsForLahetystilaUpdate,
  omistajaIdsForLahetystilaUpdate,
}: LahetaPdfViestiParameters) {
  try {
    const pdf = await generatePdf(projektiFromDB, tyyppi, kohde);
    if (!pdf) {
      return;
    }
    const saate = getSaateteksti(tyyppi, projektiFromDB, pdf.kielet);
    const viesti: PdfViesti = {
      nimi: kohde.nimi,
      otsikko: saate.otsikko,
      sisalto: saate.sisalto,
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
      kustannuspaikka: projektiFromDB.kustannuspaikka ?? undefined,
    };
    const client = await getClient();
    const resp = await client.lahetaViesti(viesti);
    const success = resp.LahetaViestiResult?.TilaKoodi?.TilaKoodi === 202;
    if (success) {
      const traceId = parseTraceId(resp.LahetaViestiResult?.TilaKoodi?.TilaKoodiKuvaus);
      auditLog.info("Suomi.fi pdf-viesti lähetetty", {
        omistajaId: omistaja ? kohde.id : undefined,
        muistuttajaId: omistaja ? undefined : kohde.id,
        sanomaTunniste: resp.LahetaViestiResult?.TilaKoodi?.SanomaTunniste,
        traceId,
      });
      await paivitaTiedotettavanLahetysStatukset({
        oid: projektiFromDB.oid,
        id: kohde.id,
        omistaja,
        tila: TiedotettavanLahetyksenTila.OK,
        approvalType: tyyppi,
        traceId,
        muistuttajaIdsForLahetystilaUpdate,
        omistajaIdsForLahetystilaUpdate,
      });
    } else {
      auditLog.info("Suomi.fi pdf-viestin lähetys epäonnistui", {
        omistajaId: omistaja ? kohde.id : undefined,
        muistuttajaId: omistaja ? undefined : kohde.id,
        sanomaTunniste: resp.LahetaViestiResult?.TilaKoodi?.SanomaTunniste,
        tilaKoodi: resp.LahetaViestiResult?.TilaKoodi?.TilaKoodi,
        tilaKoodiKuvaus: resp.LahetaViestiResult?.TilaKoodi?.TilaKoodiKuvaus,
      });
      throw new Error("Suomi.fi pdf-viestin lähetys epäonnistui: " + resp.LahetaViestiResult?.TilaKoodi?.TilaKoodiKuvaus);
    }
  } catch (e) {
    await paivitaTiedotettavanLahetysStatukset({
      oid: projektiFromDB.oid,
      id: kohde.id,
      omistaja,
      tila: TiedotettavanLahetyksenTila.VIRHE,
      approvalType: tyyppi,
      muistuttajaIdsForLahetystilaUpdate,
      omistajaIdsForLahetystilaUpdate,
    });
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

type HandleMuistuttajaParams = {
  oid: string;
  muistuttajaId: string;
  tyyppi: PublishOrExpireEventType | undefined;
  muistuttajaIdsForLahetystilaUpdate: string[] | undefined;
  omistajaIdsForLahetystilaUpdate: string[] | undefined;
};

async function handleMuistuttaja({
  oid,
  muistuttajaId,
  tyyppi,
  muistuttajaIdsForLahetystilaUpdate,
  omistajaIdsForLahetystilaUpdate,
}: HandleMuistuttajaParams) {
  const kohde = await getKohde(oid, muistuttajaId, false);
  if (!kohde) {
    return;
  }
  const muistuttaja = kohde.kohde as DBMuistuttaja;
  if (tyyppi === undefined) {
    await lahetaViesti(muistuttaja, kohde.projekti);
  } else if (isMuistuttujanTiedotOk(muistuttaja)) {
    await lahetaPdfViesti({
      projektiFromDB: kohde.projekti,
      kohde: {
        id: muistuttaja.id,
        nimi: `${muistuttaja.etunimi} ${muistuttaja.sukunimi}`,
        lahiosoite: muistuttaja.lahiosoite!,
        postinumero: muistuttaja.postinumero!,
        postitoimipaikka: muistuttaja.postitoimipaikka!,
        hetu: muistuttaja.henkilotunnus!,
        maakoodi: muistuttaja.maakoodi ? muistuttaja.maakoodi : "FI",
      },
      omistaja: false,
      tyyppi,
      muistuttajaIdsForLahetystilaUpdate,
      omistajaIdsForLahetystilaUpdate,
    });
  } else {
    auditLog.info("Muistuttajalta puuttuu pakollisia tietoja", { muistuttajaId: muistuttaja.id });
    await paivitaTiedotettavanLahetysStatukset({
      oid: muistuttaja.oid,
      id: muistuttaja.id,
      omistaja: false,
      tila: TiedotettavanLahetyksenTila.VIRHE,
      approvalType: tyyppi,
      muistuttajaIdsForLahetystilaUpdate,
      omistajaIdsForLahetystilaUpdate,
    });
  }
}

type HandleOmistajaParams = {
  oid: string;
  omistajaId: string;
  tyyppi: PublishOrExpireEventType;
  muistuttajaIdsForLahetystilaUpdate: string[] | undefined;
  omistajaIdsForLahetystilaUpdate: string[] | undefined;
};

async function handleOmistaja({
  oid,
  omistajaId,
  tyyppi,
  muistuttajaIdsForLahetystilaUpdate,
  omistajaIdsForLahetystilaUpdate,
}: HandleOmistajaParams) {
  const kohde = await getKohde(oid, omistajaId, true);
  if (!kohde) {
    return;
  }
  const omistaja = kohde.kohde as DBOmistaja;
  if (isOmistajanTiedotOk(omistaja)) {
    await lahetaPdfViesti({
      projektiFromDB: kohde.projekti,
      kohde: {
        id: omistaja.id,
        nimi: omistaja.nimi ? omistaja.nimi : `${omistaja.etunimet?.split(" ")[0]} ${omistaja.sukunimi}`,
        lahiosoite: omistaja.jakeluosoite!,
        postinumero: omistaja.postinumero!,
        postitoimipaikka: omistaja.paikkakunta!,
        hetu: omistaja.henkilotunnus,
        ytunnus: omistaja.ytunnus,
        maakoodi: omistaja.maakoodi ? omistaja.maakoodi : "FI",
      },
      omistaja: true,
      tyyppi,
      muistuttajaIdsForLahetystilaUpdate,
      omistajaIdsForLahetystilaUpdate,
    });
  } else {
    auditLog.info("Omistajalta puuttuu pakollisia tietoja", { omistajaId: omistaja.id });
    await paivitaTiedotettavanLahetysStatukset({
      oid: omistaja.oid,
      id: omistaja.id,
      omistaja: true,
      tila: TiedotettavanLahetyksenTila.VIRHE,
      approvalType: tyyppi,
      muistuttajaIdsForLahetystilaUpdate,
      omistajaIdsForLahetystilaUpdate,
    });
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
        await handleOmistaja({
          oid: msg.oid,
          omistajaId: msg.omistajaId,
          tyyppi: msg.tyyppi,
          muistuttajaIdsForLahetystilaUpdate: msg.muistuttajaIdsForLahetystilaUpdate,
          omistajaIdsForLahetystilaUpdate: msg.omistajaIdsForLahetystilaUpdate,
        });
      } else if (msg.muistuttajaId) {
        await handleMuistuttaja({
          oid: msg.oid,
          muistuttajaId: msg.muistuttajaId,
          tyyppi: msg.tyyppi,
          muistuttajaIdsForLahetystilaUpdate: msg.muistuttajaIdsForLahetystilaUpdate,
          omistajaIdsForLahetystilaUpdate: msg.omistajaIdsForLahetystilaUpdate,
        });
      } else {
        log.error("Suomi.fi sanoma virheellinen", { sanoma: msg });
      }
    } catch (e) {
      log.error("Suomi.fi viestin käsittely epäonnistui", { error: e });
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

type TiedotettavaToTiedotusMap = Map<
  string,
  {
    kiinteistonOmistajaIds: string[];
    muistuttajaIds: string[];
  }
>;

async function paivitaMapKiinteistonOmistajilla(projektiFromDB: DBProjekti, tiedotettavaMap: TiedotettavaToTiedotusMap): Promise<void> {
  const dbOmistajat = await omistajaDatabase.haeProjektinKaytossaolevatOmistajat(projektiFromDB.oid);
  dbOmistajat
    .filter((o) => o.suomifiLahetys)
    .forEach((omistaja) => {
      const tunnus = omistaja.henkilotunnus ?? omistaja.ytunnus;
      if (!tunnus) {
        log.warn("Suomi.fi tiedotettavalla ei ole henkilötunnusta tai y-tunnusta tiedottamiseen. Tiedotusta ei pystytä tekemään.", {
          id: omistaja.id,
        });
        return;
      }
      const tiedotettavanRivit =
        tiedotettavaMap.get(tunnus) ?? tiedotettavaMap.set(tunnus, { kiinteistonOmistajaIds: [], muistuttajaIds: [] }).get(tunnus)!;
      tiedotettavanRivit.kiinteistonOmistajaIds.push(omistaja.id);
    });
}

async function paivitaMapMuistuttajilla(projektiFromDB: DBProjekti, tiedotettavaMap: TiedotettavaToTiedotusMap): Promise<void> {
  const dbMuistuttajat = await muistuttajaDatabase.haeProjektinKaytossaolevatMuistuttajat(projektiFromDB.oid);
  dbMuistuttajat
    .filter((m) => m.suomifiLahetys)
    .forEach((muistuttaja) => {
      if (!muistuttaja.henkilotunnus) {
        log.warn("Suomi.fi tiedotettavalla ei ole henkilötunnusta tiedottamiseen. Tiedotusta ei pystytä tekemään.", { id: muistuttaja.id });
        return;
      }
      const tiedotettavanRivit =
        tiedotettavaMap.get(muistuttaja.henkilotunnus) ??
        tiedotettavaMap.set(muistuttaja.henkilotunnus, { kiinteistonOmistajaIds: [], muistuttajaIds: [] }).get(muistuttaja.henkilotunnus)!;
      tiedotettavanRivit.muistuttajaIds.push(muistuttaja.id);
    });
}

const OMISTAJA_PREFIX = "omistaja-";
const MUISTUTTAJA_PREFIX = "muistuttaja-";
export async function lahetaSuomiFiViestit(projektiFromDB: DBProjekti, tyyppi: PublishOrExpireEventType) {
  if (await parameters.isSuomiFiViestitIntegrationEnabled()) {
    const viestit: SendMessageBatchRequestEntry[] = [];

    const tiedotettavaToTiedotus: TiedotettavaToTiedotusMap = new Map();
    await paivitaMapKiinteistonOmistajilla(projektiFromDB, tiedotettavaToTiedotus);
    if (tyyppi === PublishOrExpireEventType.PUBLISH_HYVAKSYMISPAATOSVAIHE) {
      await paivitaMapMuistuttajilla(projektiFromDB, tiedotettavaToTiedotus);
    }
    tiedotettavaToTiedotus.forEach(({ kiinteistonOmistajaIds, muistuttajaIds }) => {
      const isOmistaja = !!kiinteistonOmistajaIds.length;
      const omistajaId = isOmistaja ? kiinteistonOmistajaIds.shift() : undefined;
      const muistuttajaId = !isOmistaja ? muistuttajaIds.shift() : undefined;
      if (!omistajaId && !muistuttajaId) {
        //Ei pitäisi tapahtua
        log.warn("Suomi.fi tiedotettavalla ei ole kiinteistöjä tai muistutuksia. Tiedottamista ei voida tehdä.");
        return;
      }
      const msg: SuomiFiSanoma = {
        omistajaId,
        muistuttajaId,
        tyyppi,
        oid: projektiFromDB.oid,
        muistuttajaIdsForLahetystilaUpdate: muistuttajaIds,
        omistajaIdsForLahetystilaUpdate: kiinteistonOmistajaIds,
      };

      const Id = isOmistaja ? OMISTAJA_PREFIX + omistajaId : MUISTUTTAJA_PREFIX + muistuttajaId;

      viestit.push({ Id, MessageBody: JSON.stringify(msg) });
    });
    if (viestit.length > 0) {
      for (const viestitChunk of chunkArray(viestit, 10)) {
        const response = await getSQS().sendMessageBatch({ QueueUrl: await parameters.getSuomiFiSQSUrl(), Entries: viestitChunk });
        response.Failed?.forEach((v) => {
          if (v.Id?.startsWith(OMISTAJA_PREFIX)) {
            auditLog.error("SuomiFi SQS sanoman lähetys epäonnistui", {
              omistajaId: v.Id.substring(OMISTAJA_PREFIX.length),
              message: v.Message,
              code: v.Code,
            });
          } else {
            auditLog.error("SuomiFi SQS sanoman lähetys epäonnistui", {
              muistuttajaId: v.Id?.substring(MUISTUTTAJA_PREFIX.length),
              message: v.Message,
              code: v.Code,
            });
          }
        });
        response.Successful?.forEach((v) => {
          if (v.Id?.startsWith(OMISTAJA_PREFIX)) {
            auditLog.info("SuomiFi SQS sanoman lähetys onnistui", { omistajaId: v.Id.substring(OMISTAJA_PREFIX.length) });
          } else {
            auditLog.info("SuomiFi SQS sanoman lähetys onnistui", { muistuttajaId: v.Id?.substring(MUISTUTTAJA_PREFIX.length) });
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
