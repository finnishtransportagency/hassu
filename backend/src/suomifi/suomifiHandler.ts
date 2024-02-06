import { SQSEvent } from "aws-lambda";
import { setupLambdaMonitoring, wrapXRayAsync } from "../aws/monitoring";
import { auditLog, log } from "../logger";
import { PdfViesti, SuomiFiClient, Viesti, getSuomiFiClient } from "./viranomaispalvelutwsinterface/suomifi";
import { parameters } from "../aws/parameters";
import { getDynamoDBDocumentClient } from "../aws/client";
import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { getMuistuttajaTableName, getOmistajaTableName } from "../util/environment";
import { DBOmistaja } from "../mml/kiinteistoHandler";
import { DBMuistuttaja } from "../muistutus/muistutusHandler";
import { muistutusEmailService } from "../muistutus/muistutusEmailService";
import { projektiDatabase } from "../database/projektiDatabase";
import { isValidEmail } from "../email/emailUtil";
import { createKuittausMuistuttajalleEmail } from "../email/emailTemplates";
import { Kieli, SuunnittelustaVastaavaViranomainen } from "hassu-common/graphql/apiModel";
import { DBProjekti, Muistutus } from "../database/model";
import { getSQS } from "../aws/clients/getSQS";
import { SendMessageBatchRequestEntry } from "@aws-sdk/client-sqs";
import { fileService } from "../files/fileService";
import { PathTuple, ProjektiPaths } from "../files/ProjektiPath";
import { translate } from "../util/localization";
import { PublishOrExpireEventType } from "../sqsEvents/projektiScheduleManager";
import { FULL_DATE_TIME_FORMAT_WITH_TZ, nyt } from "../util/dateUtil";
import { config } from "../config";

export type SuomiFiSanoma = {
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
  hetu?: string;
  ytunnus?: string;
};

let mockSuomiFiClient: SuomiFiClient | undefined;

export function setMockSuomiFiClient(client: SuomiFiClient) {
  mockSuomiFiClient = client;
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
      laskutusTunniste: cfg.laskutustunniste,
      laskutusTunnisteEly: cfg.laskutustunnisteely,
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
    postinumeroJaPostitoimipaikka: muistuttaja.postinumero + " " + muistuttaja.postitoimipaikka,
    puhelinnumero: muistuttaja.puhelinnumero,
    sahkoposti: muistuttaja.sahkoposti,
    liite: muistuttaja.liite,
  };
}

async function isSuomiFiViestitEnabled(hetu: string, id: string) {
  const client = await getClient();
  const response = await client.haeAsiakas(hetu, "SSN");
  const asiakas = response.HaeAsiakkaitaResult?.Asiakkaat?.Asiakas?.find((a) => a.attributes.AsiakasTunnus === hetu);
  const enabled = asiakas && asiakas.Tila === 300;
  auditLog.info("Suomi.fi viestit tila", { muistuttajaId: id, tila: asiakas?.Tila });
  return enabled;
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
  const kohde = resp.LisaaKohteitaResult?.Kohteet?.Kohde?.find(
    (k) => k.Asiakas?.find((a) => a.attributes.AsiakasTunnus === hetu) !== undefined
  );
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

async function paivitaLahetysStatus(id: string, omistaja: boolean, success: boolean, approvalType: PublishOrExpireEventType) {
  const params = new UpdateCommand({
    TableName: omistaja ? getOmistajaTableName() : getMuistuttajaTableName(),
    Key: {
      id,
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

async function generatePdf(projektiFromDB: DBProjekti, tyyppi: PublishOrExpireEventType) {
  // TODO: kutsu pdf lambdaa, testausta varten haetaan pdf s3 bucketista
  let path: PathTuple | undefined;
  if (tyyppi === PublishOrExpireEventType.PUBLISH_NAHTAVILLAOLO) {
    path = new ProjektiPaths(projektiFromDB.oid).nahtavillaoloVaihe(projektiFromDB.nahtavillaoloVaihe);
  } else {
    log.error("Väärä vaiheen tyyppi " + tyyppi + ", kiinteistön omistajia/muistuttajia ei tiedoteta");
    return;
  }
  try {
    const tiedostoNimi = translate("tiedostonimi.T415", Kieli.SUOMI) as string;
    return {
      file: await fileService.getProjektiFile(projektiFromDB.oid, "/" + path.yllapitoPath + "/" + tiedostoNimi + ".pdf"),
      tiedostoNimi,
      tyyppi,
    };
  } catch (e) {
    log.error("PDF generointi epäonnistui", e);
  }
}

async function lahetaPdfViesti(projektiFromDB: DBProjekti, kohde: Kohde, omistaja: boolean, tyyppi: PublishOrExpireEventType) {
  try {
    const pdf = await generatePdf(projektiFromDB, tyyppi);
    if (!pdf) {
      return;
    }
    const viesti: PdfViesti = {
      nimi: kohde.nimi,
      otsikko: "Ilmoitus kiinteistonomistajat nahtaville asettaminen",
      sisalto: "Ilmoitus kiinteistonomistajat nahtaville asettaminen...",
      lahiosoite: kohde.lahiosoite,
      postinumero: kohde.postinumero,
      postitoimipaikka: kohde.postitoimipaikka,
      maa: "FI",
      hetu: kohde.hetu,
      ytunnus: kohde.ytunnus,
      tiedosto: {
        kuvaus: pdf.tiedostoNimi,
        nimi: pdf.tiedostoNimi + ".pdf",
        sisalto: pdf.file,
      },
      vaylavirasto: projektiFromDB.velho?.suunnittelustaVastaavaViranomainen === SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
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
      await paivitaLahetysStatus(kohde.id, omistaja, true, tyyppi);
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
    await paivitaLahetysStatus(kohde.id, omistaja, false, tyyppi);
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
    muistuttaja.henkilotunnus &&
    (await isSuomiFiViestitEnabled(muistuttaja.henkilotunnus, muistuttaja.id))
  ) {
    await lahetaInfoViesti(muistuttaja.henkilotunnus, projektiFromDB, muistuttaja);
  } else {
    if (muistuttaja.sahkoposti && isValidEmail(muistuttaja.sahkoposti)) {
      await muistutusEmailService.sendEmailToMuistuttaja(projektiFromDB, createMuistutus(muistuttaja));
      auditLog.info("Muistuttajalle lähetetty sähköposti", { muistuttajaId: muistuttaja.id });
    } else {
      log.error(
        "Muistuttajalle ei voitu lähettää kuittausviestiä: " + (muistuttaja.sahkoposti ? muistuttaja.sahkoposti : "ei sähköpostiosoitetta")
      );
    }
  }
}

type DBKohde = {
  kohde: DBMuistuttaja | DBOmistaja;
  projekti: DBProjekti;
};

async function getKohde(id: string, omistaja: boolean): Promise<DBKohde | undefined> {
  const dbResponse = await getDynamoDBDocumentClient().send(
    new GetCommand({ TableName: omistaja ? getOmistajaTableName() : getMuistuttajaTableName(), Key: { id } })
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

async function handleMuistuttaja(muistuttajaId: string, tyyppi?: PublishOrExpireEventType) {
  const kohde = await getKohde(muistuttajaId, false);
  if (!kohde) {
    return;
  }
  const muistuttaja = kohde.kohde as DBMuistuttaja;
  if (tyyppi === undefined) {
    await lahetaViesti(muistuttaja, kohde.projekti);
  } else {
    if (isMuistuttujanTiedotOk(muistuttaja)) {
      await lahetaPdfViesti(
        kohde.projekti,
        {
          id: muistuttaja.id,
          nimi: `${muistuttaja.etunimi} ${muistuttaja.sukunimi}`,
          lahiosoite: muistuttaja.lahiosoite!,
          postinumero: muistuttaja.postinumero!,
          postitoimipaikka: muistuttaja.postitoimipaikka!,
          hetu: muistuttaja.henkilotunnus!,
        },
        false,
        tyyppi
      );
    } else {
      auditLog.info("Muistuttajalta puuttuu pakollisia tietoja", { muistuttajaId: muistuttaja.id });
      await paivitaLahetysStatus(muistuttaja.id, false, false, tyyppi);
    }
  }
}

async function handleOmistaja(omistajaId: string, tyyppi: PublishOrExpireEventType) {
  const kohde = await getKohde(omistajaId, true);
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
      },
      true,
      tyyppi
    );
  } else {
    auditLog.info("Omistajalta puuttuu pakollisia tietoja", { omistajaId: omistaja.id });
    await paivitaLahetysStatus(omistaja.id, true, false, tyyppi);
  }
}

const handlerFactory = (event: SQSEvent) => async () => {
  log.info("SQS sanomien määrä " + event.Records.length);
  for (const record of event.Records) {
    try {
      const msg = JSON.parse(record.body) as SuomiFiSanoma;
      log.info("Suomi.fi sanoma", { sanoma: msg });
      if (msg.omistajaId && msg.tyyppi) {
        await handleOmistaja(msg.omistajaId, msg.tyyppi);
      } else if (msg.muistuttajaId) {
        await handleMuistuttaja(msg.muistuttajaId, msg.tyyppi);
      } else {
        log.error("Suomi.fi sanoma virheellinen", { sanoma: msg });
      }
    } catch (e) {
      log.error("Suomi.fi viestin käsittely epäonnistui: " + e);
      throw e;
    }
  }
};

export const handleEvent = async (event: SQSEvent) => {
  setupLambdaMonitoring();
  await wrapXRayAsync("handler", handlerFactory(event));
};

export async function lahetaSuomiFiViestit(projektiFromDB: DBProjekti, tyyppi: PublishOrExpireEventType) {
  if (await parameters.isSuomiFiIntegrationEnabled()) {
    const viestit: SendMessageBatchRequestEntry[] = [];
    projektiFromDB.omistajat?.forEach((id) => {
      const msg: SuomiFiSanoma = { omistajaId: id, tyyppi };
      viestit.push({ Id: id, MessageBody: JSON.stringify(msg) });
    });
    projektiFromDB.muistuttajat?.forEach((id) => {
      const msg: SuomiFiSanoma = { muistuttajaId: id, tyyppi };
      viestit.push({ Id: id, MessageBody: JSON.stringify(msg) });
    });
    if (viestit.length > 0) {
      const response = await getSQS().sendMessageBatch({ QueueUrl: await parameters.getSuomiFiSQSUrl(), Entries: viestit });
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
    } else {
      log.info("Projektilla ei ole Suomi.fi tiedotettavia omistajia tai muistuttajia");
    }
  } else {
    log.info("Suomi.fi integraatio ei ole päällä, ei tiedoteta kiinteistön omistajia ja muistuttajia");
  }
}
