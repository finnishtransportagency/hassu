import {
  HaeMuistuttajatQueryVariables,
  LisaaMuistutusMutationVariables,
  Muistuttajat,
  Status,
  TallennaMuistuttajatMutationVariables,
} from "hassu-common/graphql/apiModel";
import { IllegalArgumentError, NotFoundError } from "hassu-common/error";
import { projektiDatabase } from "../database/projektiDatabase";
import { fileService } from "../files/fileService";
import { projektiAdapterJulkinen } from "../projekti/adapter/projektiAdapterJulkinen";
import { muistutusEmailService } from "./muistutusEmailService";
import { auditLog, log } from "../logger";
import { getSuomiFiCognitoKayttaja, requirePermissionMuokkaa } from "../user/userService";
import { getDynamoDBDocumentClient } from "../aws/client";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { uuid } from "hassu-common/util/uuid";
import { config } from "../config";
import { FULL_DATE_TIME_FORMAT_WITH_TZ, localDateTimeString, nyt } from "../util/dateUtil";
import { DBProjekti, Muistutus } from "../database/model";
import { getMuistuttajaTableName } from "../util/environment";
import { getSQS } from "../aws/clients/getSQS";
import { parameters } from "../aws/parameters";
import { SuomiFiSanoma } from "../suomifi/suomifiHandler";
import { DBMuistuttaja, muistuttajaDatabase } from "../database/muistuttajaDatabase";
import { muistuttajaSearchService } from "../projektiSearch/muistuttajaSearch/muistuttajaSearchService";
import { adaptMuistutusInput } from "./muistutusAdapter";

function getExpires() {
  // muistuttajien tiedot säilyvät seitsemän vuotta auditointilokia varten
  let days = 2557;
  if (!config.isPermanentEnvironment()) {
    days = 90;
  }
  return Math.round(Date.now() / 1000) + 60 * 60 * 24 * days;
}

async function getProjektiAndCheckPermissions(oid: string): Promise<DBProjekti> {
  const projekti = await projektiDatabase.loadProjektiByOid(oid);
  if (!projekti) {
    log.error("Projektia ei löydy");
    throw new NotFoundError("Projektia ei löydy");
  }
  requirePermissionMuokkaa(projekti);
  return projekti;
}

class MuistutusHandler {
  async kasitteleMuistutus({ oid, muistutus: muistutusInput }: LisaaMuistutusMutationVariables) {
    const projektiFromDB = await projektiDatabase.loadProjektiByOid(oid);
    if (!projektiFromDB) {
      log.error("Projektia ei löydy");
      throw new NotFoundError("Projektia ei löydy");
    }
    const julkinenProjekti = await projektiAdapterJulkinen.adaptProjekti(projektiFromDB);
    if (!julkinenProjekti) {
      log.error("Projektia ei löydy tai se ei ole vielä julkinen");
      throw new NotFoundError("Projektia ei löydy tai se ei ole vielä julkinen");
    }

    if (julkinenProjekti.status !== Status.NAHTAVILLAOLO) {
      log.error("Projekti ei ole nähtävilläolovaiheessa, joten muistutuksia ei voi antaa", julkinenProjekti.status);
      throw new NotFoundError("Projekti ei ole nähtävilläolovaiheessa, joten muistutuksia ei voi antaa");
    }

    const loggedInUser = this.getLoggedInUser();

    const aikaleima = localDateTimeString();
    const muistutusId = uuid.v4();
    const liitteet = await this.persistLiitteet(muistutusInput.liitteet, oid, muistutusId);
    const muistutus: Muistutus = adaptMuistutusInput({ aikaleima, muistutusId, liitteet, loggedInUser, muistutusInput });

    const henkilotunnus = loggedInUser?.["custom:hetu"];

    const muistuttaja: DBMuistuttaja = {
      id: muistutus.id,
      expires: getExpires(),
      lisatty: nyt().format(FULL_DATE_TIME_FORMAT_WITH_TZ),
      henkilotunnus,
      etunimi: muistutus?.etunimi,
      sukunimi: muistutus?.sukunimi,
      lahiosoite: muistutus.katuosoite,
      postinumero: muistutus.postinumero,
      postitoimipaikka: muistutus.postitoimipaikka,
      maakoodi: muistutus.maakoodi,
      sahkoposti: muistutus.sahkoposti,
      vastaanotettu: muistutus.vastaanotettu,
      muistutus: muistutus.muistutus,
      oid: projektiFromDB.oid,
      suomifiLahetys: !!henkilotunnus,
      liitteet: muistutus.liitteet,
      puhelinnumero: muistutus.puhelinnumero,
      kaytossa: true,
    };
    auditLog.info("Tallennetaan muistuttajan tiedot", { muistuttajaId: muistuttaja.id });
    await getDynamoDBDocumentClient().send(new PutCommand({ TableName: getMuistuttajaTableName(), Item: muistuttaja }));
    await projektiDatabase.appendMuistuttajatList(oid, [muistuttaja.id], !henkilotunnus);
    await muistutusEmailService.sendEmailToKirjaamo(projektiFromDB, muistutus);
    const msg: SuomiFiSanoma = {
      oid,
      muistuttajaId: muistuttaja.id,
    };
    await getSQS().sendMessage({ QueueUrl: await parameters.getSuomiFiSQSUrl(), MessageBody: JSON.stringify(msg) });
    return "OK";
  }

  getLoggedInUser() {
    return getSuomiFiCognitoKayttaja();
  }

  private async persistLiitteet(
    liitteet: string[] | undefined | null,
    oid: string,
    muistutusId: string
  ): Promise<DBMuistuttaja["liitteet"]> {
    if (!liitteet) {
      return liitteet;
    }

    return await Promise.all(
      liitteet.map(
        async (liite) =>
          await fileService.persistFileToProjekti({
            uploadedFileSource: liite,
            oid,
            targetFilePathInProjekti: "muistutukset/" + muistutusId,
          })
      )
    );
  }

  async haeMuistuttajat(variables: HaeMuistuttajatQueryVariables): Promise<Muistuttajat> {
    await getProjektiAndCheckPermissions(variables.oid);
    log.info("Haetaan muistuttajatiedot", variables);
    const muistuttajatResponse = await muistuttajaSearchService.searchMuistuttajat(variables);
    muistuttajatResponse.muistuttajat.forEach((m) => auditLog.info("Näytetään muistuttajan tiedot", { muistuttajaId: m.id }));
    return muistuttajatResponse;
  }

  async tallennaMuistuttajat(input: TallennaMuistuttajatMutationVariables) {
    const projekti = await getProjektiAndCheckPermissions(input.oid);
    const now = nyt().format(FULL_DATE_TIME_FORMAT_WITH_TZ);
    const expires = getExpires();
    const initialMuistuttajat = await muistuttajaDatabase.haeProjektinKaytossaolevatMuistuttajat(projekti.oid);
    if (input.poistettavatMuistuttajat.length > 0) {
      await poistaMuistuttajat(projekti.oid, initialMuistuttajat, input.poistettavatMuistuttajat);
    }
    const sailytettavatMuistuttajat = await haeSailytettavatMuistuttajat(initialMuistuttajat, input.poistettavatMuistuttajat);
    const tallennettavatMuistuttajatInput = input.muutMuistuttajat.filter((muistuttaja) => {
      if (!muistuttaja.id || sailytettavatMuistuttajat.muutMuistuttajat.some((m) => m.id === muistuttaja.id)) {
        return true;
      }
      throw new IllegalArgumentError(`Tallennettava muistuttaja id:'${muistuttaja.id}' ei ole muutMuistuttajat listalla`);
    });
    const ids: string[] = [];
    for (const muistuttaja of tallennettavatMuistuttajatInput) {
      let dbMuistuttaja: DBMuistuttaja | undefined;
      if (muistuttaja.id) {
        dbMuistuttaja = sailytettavatMuistuttajat.muutMuistuttajat.find((m) => m.id === muistuttaja.id);
        if (!dbMuistuttaja) {
          throw new Error("Muistuttajaa " + muistuttaja.id + " ei löydy");
        }
        dbMuistuttaja.paivitetty = now;
        auditLog.info("Päivitetään muistuttajan tiedot", { muistuttajaId: dbMuistuttaja.id });
      } else {
        dbMuistuttaja = {
          id: uuid.v4(),
          oid: input.oid,
          lisatty: now,
          suomifiLahetys: false,
          kaytossa: true,
          expires,
        };
        auditLog.info("Lisätään muistuttajan tiedot", { muistuttajaId: dbMuistuttaja.id });
      }
      dbMuistuttaja.nimi = muistuttaja.nimi;
      dbMuistuttaja.sahkoposti = muistuttaja.sahkoposti;
      dbMuistuttaja.tiedotustapa = muistuttaja.tiedotustapa;
      dbMuistuttaja.lahiosoite = muistuttaja.jakeluosoite;
      dbMuistuttaja.postinumero = muistuttaja.postinumero;
      dbMuistuttaja.postitoimipaikka = muistuttaja.paikkakunta;
      dbMuistuttaja.maakoodi = muistuttaja.maakoodi;
      await getDynamoDBDocumentClient().send(new PutCommand({ TableName: getMuistuttajaTableName(), Item: dbMuistuttaja }));
      ids.push(dbMuistuttaja.id);
    }
    return ids;
  }
}

export async function poistaMuistuttajat(
  oid: string,
  initialMuistuttajat: DBMuistuttaja[],
  poistettavatMuistuttajat: string[]
) {
  poistettavatMuistuttajat.forEach((poistettavaId) => {
    const idFound = initialMuistuttajat.some((muistuttaja) => muistuttaja.id === poistettavaId);
    if (!idFound) {
      throw new IllegalArgumentError(`Poistettavaa muistuttajaa id: '${poistettavaId}' ei löytynyt`);
    }
  });
  await Promise.all(
    poistettavatMuistuttajat.map(async (id) => {
      auditLog.info("Poistetaan muistuttaja", { muistuttajaId: id });
      await muistuttajaDatabase.poistaMuistuttajaKaytosta(oid, id);
    })
  );
}

export async function haeSailytettavatMuistuttajat(
  initialMuistuttajat: DBMuistuttaja[],
  poistettavatMuistuttajat: string[]
): Promise<{
  muistuttajat: DBMuistuttaja[];
  muutMuistuttajat: DBMuistuttaja[];
}> {
  const sailytettavat = initialMuistuttajat.filter((muistuttaja) => !poistettavatMuistuttajat.includes(muistuttaja.id));
  return sailytettavat.reduce<{
    muistuttajat: DBMuistuttaja[];
    muutMuistuttajat: DBMuistuttaja[];
  }>(
    (jaotellutMuistuttajat, muistuttaja) => {
      if (muistuttaja.suomifiLahetys) {
        jaotellutMuistuttajat.muistuttajat.push(muistuttaja);
      } else {
        jaotellutMuistuttajat.muutMuistuttajat.push(muistuttaja);
      }
      return jaotellutMuistuttajat;
    },
    { muistuttajat: [], muutMuistuttajat: [] }
  );
}

export const muistutusHandler = new MuistutusHandler();
