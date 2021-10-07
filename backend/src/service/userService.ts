import { AppSyncResolverEventHeaders } from "aws-lambda/trigger/appsync-resolver";
import { validateJwtToken } from "../util/validatejwttoken";
import { config } from "../config";
import log from "loglevel";
import { IllegalAccessError } from "../error/IllegalAccessError";
import { Kayttaja } from "../api/apiModel";
import { personSearch } from "../personSearch/personSearchClient";

let vaylaUser: Kayttaja;

function parseRoles(roles: string) {
  return roles ? roles.split("\\,").map((arn) => arn.split("/").pop()) : undefined;
}

async function identifyUser(headers: AppSyncResolverEventHeaders) {
  vaylaUser = undefined;
  if (headers) {
    const jwt = await validateJwtToken(headers["x-iam-accesstoken"], headers["x-iam-data"], config.cognitoURL);
    if (jwt) {
      vaylaUser = {
        __typename: "Kayttaja",
        etuNimi: jwt["custom:etunimi"],
        sukuNimi: jwt["custom:sukunimi"],
        uid: jwt["custom:uid"],
        vaylaKayttaja: true,
        roolit: parseRoles(jwt["custom:rooli"]),
      } as Kayttaja;
    }
  }
  if (vaylaUser) {
    log.info("Current user:", vaylaUser);
  } else {
    log.info("Anonymous user");
  }
}

/**
 * For test use only
 * @param kayttaja
 */
function identifyMockUser(kayttaja?: Kayttaja) {
  vaylaUser = kayttaja;
  if (vaylaUser) {
    log.info("Current user:", vaylaUser);
  } else {
    log.info("Anonymous user");
  }
}

function listAllUsers() {
  return personSearch.listAccounts();
}

function mockUser(user: Kayttaja) {
  vaylaUser = user;
}

function getVaylaUser() {
  return vaylaUser;
}

function isVaylaUser() {
  return !!getVaylaUser();
}

function isSuomiFiUser() {
  return false;
}

function requireVaylaUser() {
  if (!isVaylaUser()) {
    throw new IllegalAccessError("Väylä-kirjautuminen puuttuu");
  }
}

export {
  identifyUser,
  isVaylaUser,
  isSuomiFiUser,
  getVaylaUser,
  requireVaylaUser,
  mockUser,
  identifyMockUser,
  listAllUsers,
};
