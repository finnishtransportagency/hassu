import { AppSyncResolverEvent } from "aws-lambda/trigger/appsync-resolver";
import { validateJwtToken } from "../util/validatejwttoken";
import { config } from "../config";
import log from "loglevel";
import { IllegalAccessError } from "../error/IllegalAccessError";
import { Kayttaja } from "../../../common/graphql/apiModel";
import { DBProjekti } from "../database/model/projekti";

let vaylaUser: Kayttaja | undefined;

function parseRoles(roles: string) {
  const strings = roles
    ? roles
        .replace("\\", "")
        .split(",")
        .map((s) => s.split("/").pop())
    : undefined;
  return strings;
}

export type IdentifyUserFunc = (event: AppSyncResolverEvent<any>) => Promise<Kayttaja | undefined>;

const identifyLoggedInVaylaUser: IdentifyUserFunc = async (event: AppSyncResolverEvent<any>) => {
  const headers = event.request?.headers;
  if (headers) {
    const jwt = await validateJwtToken(headers["x-iam-accesstoken"], headers["x-iam-data"], config.cognitoURL);
    if (jwt) {
      const user = {
        __typename: "Kayttaja",
        etuNimi: jwt["custom:etunimi"],
        sukuNimi: jwt["custom:sukunimi"],
        uid: jwt["custom:uid"],
        vaylaKayttaja: true,
        roolit: parseRoles(jwt["custom:rooli"]),
      } as Kayttaja;
      if (!isHassuKayttaja(user)) {
        throw new IllegalAccessError("Ei käyttöoikeutta palveluun " + JSON.stringify(user));
      }
      return user;
    }
  }
};

const identifyUserFunctions = [identifyLoggedInVaylaUser];

export const identifyUser = async (event: AppSyncResolverEvent<any>) => {
  for (const identifyUserFunction of identifyUserFunctions) {
    const user = await identifyUserFunction(event);
    if (user) {
      vaylaUser = user;
      log.info("Current user:", vaylaUser);
      return;
    }
  }
  vaylaUser = undefined;
  log.info("Anonymous user");
};

export const installIdentifyUserFunction = (func: IdentifyUserFunc) => identifyUserFunctions.push(func);

if (process.env.USER_IDENTIFIER_FUNCTIONS) {
  import(process.env.USER_IDENTIFIER_FUNCTIONS);
}

/**
 * For test use only
 * @param kayttaja
 */
export function identifyMockUser(kayttaja?: Kayttaja) {
  vaylaUser = kayttaja;
  if (vaylaUser) {
    log.info("Current user:", vaylaUser);
  } else {
    log.info("Anonymous user");
  }
}

export function getVaylaUser(): Kayttaja {
  if (!vaylaUser) {
    throw new IllegalAccessError("Väylä-kirjautuminen puuttuu");
  }
  return vaylaUser;
}

function requireVaylaUser(): Kayttaja {
  if (!vaylaUser) {
    throw new IllegalAccessError("Väylä-kirjautuminen puuttuu");
  }
  return vaylaUser;
}

// Role: admin
function isHassuAdmin(kayttaja: Kayttaja) {
  return kayttaja.roolit?.includes("hassu_admin");
}

// Role: kayttaja
function isHassuKayttaja(kayttaja: Kayttaja) {
  return kayttaja.roolit?.includes("hassu_kayttaja") || isHassuAdmin(kayttaja);
}

export function isAorL(account: Kayttaja) {
  return isATunnus(account) || isLTunnus(account);
}

export function requirePermissionLuku(): Kayttaja {
  return requireVaylaUser();
}

export function requirePermissionLuonti() {
  const kayttaja = requireVaylaUser();
  if (!isAorL(kayttaja)) {
    throw new IllegalAccessError("Vain L ja A tunnuksella voi luoda uusia projekteja");
  }
}

export function requirePermissionMuokkaa(projekti: DBProjekti) {
  const kayttaja = requireVaylaUser();
  if (!isAorL(kayttaja)) {
    throw new IllegalAccessError("Vain L ja A tunnuksella voi muokata projekteja");
  }
  // Current user must be added into the projekti with any role
  const projektiUser = projekti.kayttoOikeudet.filter((user) => user.kayttajatunnus === kayttaja.uid).pop();
  if (!projektiUser) {
    throw new IllegalAccessError("Sinulla ei ole käyttöoikeutta muokata projektia");
  }
}

function isATunnus(account: Kayttaja) {
  return account?.roolit?.includes("Atunnukset");
}

function isLTunnus(account: Kayttaja) {
  return account?.roolit?.includes("Ltunnukset");
}
