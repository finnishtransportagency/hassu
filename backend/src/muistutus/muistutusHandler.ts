import { HaeMuistuttajatQueryVariables, LisaaMuistutusMutationVariables, Muistuttajat, Status } from "hassu-common/graphql/apiModel";
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
import { BatchGetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { uuid } from "hassu-common/util/uuid";
import { config } from "../config";
import { nyt } from "../util/dateUtil";

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
      lisatty: nyt().toISOString(),
      etunimi: muistutus.etunimi,
      sukunimi: muistutus.sukunimi,
      henkilotunnus: loggedInUser ? loggedInUser["custom:hetu"] : undefined,
      lahiosoite: muistutus.katuosoite,
      postinumero: muistutus.postinumeroJaPostitoimipaikka?.split(" ")[0],
      postitoimipaikka: muistutus.postinumeroJaPostitoimipaikka?.split(" ")[1],
      sahkoposti: muistutus.sahkoposti,
      puhelinnumero: muistutus.puhelinnumero,
    };
    auditLog.info("Tallennetaan muistuttajan tiedot", { muistuttajaId: muistuttaja.id });
    await getDynamoDBDocumentClient().send(new PutCommand({ TableName: getTableName(), Item: muistuttaja }));
    await projektiDatabase.appendMuistuttajatList(oid, muistuttaja.id);

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
    const muistuttajat = projekti?.muistuttajat ?? [];
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
          etunimet: m.etunimi,
          sukunimi: m.sukunimi,
          jakeluosoite: m.lahiosoite,
          postinumero: m.postinumero,
          paikkakunta: m.postitoimipaikka,
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
}

export const muistutusHandler = new MuistutusHandler();
