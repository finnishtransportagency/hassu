import { AppSyncResolverEvent } from "aws-lambda/trigger/appsync-resolver";
import { validateJwtToken } from "../util/validatejwttoken";
import { config } from "../config";
import log from "loglevel";
import { IllegalAccessError } from "../error/IllegalAccessError";
import { Kayttaja } from "../../../common/graphql/apiModel";
import { personSearch } from "../personSearch/personSearchClient";

let vaylaUser: Kayttaja | undefined;

function parseRoles(roles: string) {
  return roles ? roles.split("\\,").map((arn) => arn.split("/").pop()) : undefined;
}

export type IdentifyUserFunc = (event: AppSyncResolverEvent<any>) => Promise<Kayttaja | undefined>;

const identifyLoggedInVaylaUser: IdentifyUserFunc = async (event: AppSyncResolverEvent<any>) => {
  const headers = event.request?.headers;
  if (headers) {
    const jwt = await validateJwtToken(headers["x-iam-accesstoken"], headers["x-iam-data"], config.cognitoURL);
    if (jwt) {
      return {
        __typename: "Kayttaja",
        etuNimi: jwt["custom:etunimi"],
        sukuNimi: jwt["custom:sukunimi"],
        uid: jwt["custom:uid"],
        vaylaKayttaja: true,
        roolit: parseRoles(jwt["custom:rooli"]),
      } as Kayttaja;
    }
  }
};

const identifyUserFunctions = [identifyLoggedInVaylaUser];

const identifyUser = async (event: AppSyncResolverEvent<any>) => {
  for (const identifyUserFunction of identifyUserFunctions) {
    const user = await identifyUserFunction(event);
    if (user) {
      vaylaUser = user;
      log.info("Current user:", vaylaUser);
      return;
    }
  }
  log.info("Anonymous user");
};

const installIdentifyUserFunction = (func: IdentifyUserFunc) => identifyUserFunctions.push(func);

if (process.env.USER_IDENTIFIER_FUNCTIONS) {
  import(process.env.USER_IDENTIFIER_FUNCTIONS);
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

function getVaylaUser(): Kayttaja {
  if (!vaylaUser) {
    throw new IllegalAccessError("Väylä-kirjautuminen puuttuu");
  }
  return vaylaUser;
}

function isVaylaUser() {
  return !!vaylaUser;
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
  installIdentifyUserFunction,
};
