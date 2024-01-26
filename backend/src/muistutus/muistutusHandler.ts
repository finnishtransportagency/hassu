import { HaeMuistuttajatQueryVariables, LisaaMuistutusMutationVariables, Muistuttaja, Muistuttajat, PoistaMuistuttajaMutationVariables, Status, TallennaMuistuttajatMutationVariables } from "hassu-common/graphql/apiModel";
import { NotFoundError } from "hassu-common/error";
import { projektiDatabase } from "../database/projektiDatabase";
import { fileService } from "../files/fileService";
import { projektiAdapterJulkinen } from "../projekti/adapter/projektiAdapterJulkinen";
import { muistutusEmailService } from "./muistutusEmailService";
import { adaptMuistutusInput } from "./muistutusAdapter";
import { auditLog, log } from "../logger";
import { isValidEmail } from "../email/emailUtil";
import { getSuomiFiCognitoKayttaja, requireVaylaUser } from "../user/userService";
import { getDynamoDBDocumentClient } from "../aws/client";
import { BatchGetCommand, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { uuid } from "hassu-common/util/uuid";
import { config } from "../config";
import { FULL_DATE_TIME_FORMAT_WITH_TZ, nyt } from "../util/dateUtil";

function getTableName() {
  if (process.env.TABLE_MUISTUTTAJA) {
    return process.env.TABLE_MUISTUTTAJA;
  }
  throw new Error("Ympäristömuuttujaa TABLE_MUISTUTTAJA ei löydy");
}

function getExpires() {
  // muistuttajien tiedot säilyvät seitsemän vuotta auditointilokia varten
  let days = 2557;
  if (!config.isPermanentEnvironment()) {
    days = 90;
  }
  return Math.round(Date.now() / 1000) + 60 * 60 * 24 * days;
}

export type DBMuistuttaja = {
  id: string;
  expires: number;
  lisatty: string;
  etunimi?: string | null;
  sukunimi?: string | null;
  henkilotunnus?: string | null;
  lahiosoite?: string | null;
  postinumero?: string | null;
  postitoimipaikka?: string | null;
  sahkoposti?: string | null;
  puhelinnumero?: string | null;
  nimi?: string | null;
  tiedotusosoite?: string | null;
  tiedotustapa?: string | null;
  paivitetty?: string | null;
};

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

    const muistutus = adaptMuistutusInput(muistutusInput);
    if (muistutus.liite) {
      muistutus.liite = await fileService.persistFileToProjekti({
        uploadedFileSource: muistutus.liite,
        oid,
        targetFilePathInProjekti: "muistutukset/" + muistutus.id,
      });
    }

    await muistutusEmailService.sendEmailToKirjaamo(projektiFromDB, muistutus);

    const loggedInUser = getSuomiFiCognitoKayttaja();

    const muistuttaja: DBMuistuttaja = {
      id: uuid.v4(),
      expires: getExpires(),
      lisatty: nyt().format(FULL_DATE_TIME_FORMAT_WITH_TZ),
      etunimi: muistutus.etunimi,
      sukunimi: muistutus.sukunimi,
      henkilotunnus: loggedInUser ? loggedInUser["custom:hetu"] : undefined,
      lahiosoite: muistutus.katuosoite,
      postinumero: muistutus.postinumeroJaPostitoimipaikka?.split(" ")[0],
      postitoimipaikka: muistutus.postinumeroJaPostitoimipaikka?.split(" ").slice(1).join(" "),
      sahkoposti: muistutus.sahkoposti,
      puhelinnumero: muistutus.puhelinnumero,
    };
    auditLog.info("Tallennetaan muistuttajan tiedot", { muistuttajaId: muistuttaja.id });
    await getDynamoDBDocumentClient().send(new PutCommand({ TableName: getTableName(), Item: muistuttaja }));
    await projektiDatabase.appendMuistuttajatList(oid, [muistuttaja.id]);

    if (muistutus.sahkoposti && isValidEmail(muistutus.sahkoposti)) {
      await muistutusEmailService.sendEmailToMuistuttaja(projektiFromDB, muistutus);
    } else {
      log.error("Muistuttajalle ei voitu lähettää kuittausviestiä: ", muistutus.sahkoposti);
    }

    return "OK";
  }

  async haeMuistuttajat(variables: HaeMuistuttajatQueryVariables): Promise<Muistuttajat> {
    requireVaylaUser();
    const projekti = await projektiDatabase.loadProjektiByOid(variables.oid);
    const sivuKoko = variables.sivuKoko ?? 10;
    const muistuttajat = variables.muutMuistuttajat ? projekti?.muutMuistuttajat ?? []: projekti?.muistuttajat ?? [];
    const start = (variables.sivu - 1) * sivuKoko;
    const end = start + sivuKoko > muistuttajat.length ? undefined : start + sivuKoko;
    const ids = muistuttajat.slice(start, end);
    if (muistuttajat.length > 0 && ids.length > 0) {
      log.info("Haetaan muistuttajia", { tunnukset: ids });
      const command = new BatchGetCommand({
        RequestItems: {
          [getTableName()]: {
            Keys: ids.map((key) => ({
              id: key,
            })),
          },
        },
      });
      const response = await getDynamoDBDocumentClient().send(command);
      const dbMuistuttajat = response.Responses ? (response.Responses[getTableName()] as DBMuistuttaja[]) : [];
      dbMuistuttajat.forEach((m) => auditLog.info("Näytetään muistuttajan tiedot", { muistuttajaId: m.id }));
      return {
        __typename: "Muistuttajat",
        hakutulosMaara: muistuttajat.length,
        sivunKoko: sivuKoko,
        sivu: variables.sivu,
        muistuttajat: dbMuistuttajat.map((m) => ({
          __typename: "Muistuttaja",
          id: m.id,
          lisatty: m.lisatty,
          paivitetty: m.paivitetty,
          etunimet: m.etunimi,
          sukunimi: m.sukunimi,
          jakeluosoite: m.lahiosoite,
          postinumero: m.postinumero,
          paikkakunta: m.postitoimipaikka,
          nimi: m.nimi,
          tiedotusosoite: m.tiedotusosoite,
          tiedotustapa: m.tiedotustapa,
        })),
      };
    } else {
      return {
        __typename: "Muistuttajat",
        hakutulosMaara: muistuttajat.length,
        sivunKoko: sivuKoko,
        sivu: variables.sivu,
        muistuttajat: [],
      };
    }
  }

  async tallennaMuistuttajat(input: TallennaMuistuttajatMutationVariables): Promise<Muistuttaja[]> {
    requireVaylaUser();
    const projekti = await projektiDatabase.loadProjektiByOid(input.oid);
    if (!projekti) {
      throw new Error("Projektia ei löydy");
    }
    const now = nyt().format(FULL_DATE_TIME_FORMAT_WITH_TZ);
    const expires = getExpires();
    let dbmuistuttaja: DBMuistuttaja | undefined;
    const muistuttajat: DBMuistuttaja[] = [];
    const uudetMuistuttajat: string[] = [];
    for (const muistuttaja of input.muistuttajat) {
      if (muistuttaja.id) {
        const response = await getDynamoDBDocumentClient().send(new GetCommand({ TableName: getTableName(), Key: { id: muistuttaja.id } }));
        dbmuistuttaja = response.Item as DBMuistuttaja;
        if (!dbmuistuttaja) {
          throw new Error("Muistuttajaa " + muistuttaja.id + " ei löydy");
        }
        dbmuistuttaja.paivitetty = now;
        dbmuistuttaja.nimi = muistuttaja.nimi,
        dbmuistuttaja.tiedotusosoite= muistuttaja.tiedotusosoite,
        dbmuistuttaja.tiedotustapa = muistuttaja.tiedotustapa,
        auditLog.info("Päivitetään muistuttajan tiedot", { muistuttajaId: dbmuistuttaja.id });
      } else {
        dbmuistuttaja = {
          id: uuid.v4(),
          lisatty: now,
          expires,
          nimi: muistuttaja.nimi,
          tiedotusosoite: muistuttaja.tiedotusosoite,
          tiedotustapa: muistuttaja.tiedotustapa,
        };
        auditLog.info("Lisätään muistuttajan tiedot", { muistuttajaId: dbmuistuttaja.id });
        uudetMuistuttajat.push(dbmuistuttaja.id);
      }
      await getDynamoDBDocumentClient().send(new PutCommand({ TableName: getTableName(), Item: dbmuistuttaja }));
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
    requireVaylaUser();
    const projekti = await projektiDatabase.loadProjektiByOid(input.oid);
    if (!projekti) {
      throw new Error("Projektia ei löydy");
    }
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
