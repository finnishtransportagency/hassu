import {
  HaeMuistuttajatQueryVariables,
  LisaaMuistutusMutationVariables,
  Muistuttaja,
  Muistuttajat,
  PoistaMuistuttajaMutationVariables,
  Status,
  TallennaMuistuttajatMutationVariables,
} from "hassu-common/graphql/apiModel";
import { NotFoundError } from "hassu-common/error";
import { projektiDatabase } from "../database/projektiDatabase";
import { fileService } from "../files/fileService";
import { projektiAdapterJulkinen } from "../projekti/adapter/projektiAdapterJulkinen";
import { muistutusEmailService } from "./muistutusEmailService";
import { auditLog, log } from "../logger";
import { getSuomiFiCognitoKayttaja, requirePermissionMuokkaa } from "../user/userService";
import { getDynamoDBDocumentClient } from "../aws/client";
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { uuid } from "hassu-common/util/uuid";
import { config } from "../config";
import { FULL_DATE_TIME_FORMAT_WITH_TZ, localDateTimeString, nyt } from "../util/dateUtil";
import { DBProjekti, Muistutus } from "../database/model";
import { getMuistuttajaTableName } from "../util/environment";
import { getSQS } from "../aws/clients/getSQS";
import { parameters } from "../aws/parameters";
import { SuomiFiSanoma } from "../suomifi/suomifiHandler";
import { DBMuistuttaja } from "../database/muistuttajaDatabase";
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

    await muistutusEmailService.sendEmailToKirjaamo(projektiFromDB, muistutus);

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
    };
    auditLog.info("Tallennetaan muistuttajan tiedot", { muistuttajaId: muistuttaja.id });
    await getDynamoDBDocumentClient().send(new PutCommand({ TableName: getMuistuttajaTableName(), Item: muistuttaja }));
    await projektiDatabase.appendMuistuttajatList(oid, [muistuttaja.id], !henkilotunnus);
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

  async tallennaMuistuttajat(input: TallennaMuistuttajatMutationVariables): Promise<Muistuttaja[]> {
    const projekti = await getProjektiAndCheckPermissions(input.oid);
    const now = nyt().format(FULL_DATE_TIME_FORMAT_WITH_TZ);
    const expires = getExpires();
    let dbmuistuttaja: DBMuistuttaja | undefined;
    const muistuttajat: DBMuistuttaja[] = [];
    const uudetMuistuttajat: string[] = [];
    for (const muistuttaja of input.muistuttajat) {
      if (muistuttaja.id) {
        const response = await getDynamoDBDocumentClient().send(
          new GetCommand({ TableName: getMuistuttajaTableName(), Key: { id: muistuttaja.id, oid: input.oid } })
        );
        dbmuistuttaja = response.Item as DBMuistuttaja;
        if (!dbmuistuttaja || !projekti.muutMuistuttajat?.includes(muistuttaja.id)) {
          throw new Error("Muistuttajaa " + muistuttaja.id + " ei löydy");
        }
        dbmuistuttaja.paivitetty = now;
        dbmuistuttaja.nimi = muistuttaja.nimi;
        dbmuistuttaja.tiedotusosoite = muistuttaja.tiedotusosoite;
        dbmuistuttaja.tiedotustapa = muistuttaja.tiedotustapa;
        auditLog.info("Päivitetään muistuttajan tiedot", { muistuttajaId: dbmuistuttaja.id });
      } else {
        dbmuistuttaja = {
          id: uuid.v4(),
          lisatty: now,
          expires,
          nimi: muistuttaja.nimi,
          tiedotusosoite: muistuttaja.tiedotusosoite,
          tiedotustapa: muistuttaja.tiedotustapa,
          oid: projekti.oid,
        };
        auditLog.info("Lisätään muistuttajan tiedot", { muistuttajaId: dbmuistuttaja.id });
        uudetMuistuttajat.push(dbmuistuttaja.id);
      }
      await getDynamoDBDocumentClient().send(new PutCommand({ TableName: getMuistuttajaTableName(), Item: dbmuistuttaja }));
      muistuttajat.push(dbmuistuttaja);
    }
    if (uudetMuistuttajat.length > 0) {
      projektiDatabase.appendMuistuttajatList(input.oid, uudetMuistuttajat, true);
    }
    return muistuttajat.map((m) => {
      return {
        __typename: "Muistuttaja",
        id: m.id,
        lisatty: m.lisatty,
        paivitetty: m.paivitetty,
        nimi: m.nimi,
        tiedotusosoite: m.tiedotusosoite,
        tiedotustapa: m.tiedotustapa,
      };
    });
  }
  async poistaMuistuttaja(input: PoistaMuistuttajaMutationVariables) {
    const projekti = await getProjektiAndCheckPermissions(input.oid);
    const muutMuistuttajat = projekti.muutMuistuttajat ?? [];
    const idx = muutMuistuttajat.indexOf(input.muistuttaja);
    if (idx !== -1) {
      muutMuistuttajat.splice(idx, 1);
      auditLog.info("Poistetaan muu muistuttaja", { muistuttajaId: input.muistuttaja });
      auditLog.info("Päivitetään muut muistuttajat projektille", { muutMuistuttajat });
      projektiDatabase.setMuutMuistuttajat(input.oid, muutMuistuttajat);
    } else {
      throw new Error("Muistuttajaa " + input.muistuttaja + " ei löydy");
    }
  }
}

export const muistutusHandler = new MuistutusHandler();
