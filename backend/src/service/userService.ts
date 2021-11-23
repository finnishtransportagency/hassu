import { AppSyncResolverEvent } from "aws-lambda/trigger/appsync-resolver";
import { validateJwtToken } from "../util/validatejwttoken";
import { config } from "../config";
import log from "loglevel";
import { IllegalAccessError } from "../error/IllegalAccessError";
import { Kayttaja, VaylaKayttajaTyyppi } from "../../../common/graphql/apiModel";
import { DBProjekti } from "../database/model/projekti";

function parseRoles(roles: string) {
  return roles
    ? roles
        .replace("\\", "")
        .split(",")
        .map((s) => s.split("/").pop())
    : undefined;
}

function adaptKayttajaTyyppi(roolit: string[]) {
  const roleToTypeMap = {
    Atunnukset: VaylaKayttajaTyyppi.A_TUNNUS,
    Ltunnukset: VaylaKayttajaTyyppi.L_TUNNUS,
    LXtunnukset: VaylaKayttajaTyyppi.LX_TUNNUS,
  };
  for (const role of roolit) {
    const type = roleToTypeMap[role];
    if (type) {
      return type;
    }
  }
  return;
}

export type IdentifyUserFunc = (event: AppSyncResolverEvent<any>) => Promise<Kayttaja | undefined>;

const identifyLoggedInVaylaUser: IdentifyUserFunc = async (event: AppSyncResolverEvent<any>) => {
  const headers = event.request?.headers;

  if (headers) {
    const jwt = await validateJwtToken(headers["x-iam-accesstoken"], headers["x-iam-data"], config.cognitoURL);
    if (jwt) {
      const roolit = parseRoles(jwt["custom:rooli"]);
      const user: Kayttaja = {
        __typename: "Kayttaja",
        etuNimi: jwt["custom:etunimi"],
        sukuNimi: jwt["custom:sukunimi"],
        uid: jwt["custom:uid"],
        roolit,
      };
      if (!isHassuKayttaja(user)) {
        throw new IllegalAccessError("Ei käyttöoikeutta palveluun " + JSON.stringify(user));
      }
      return user;
    }
  }
};

const identifyUserFunctions = [identifyLoggedInVaylaUser];

export const identifyUser = async (event: AppSyncResolverEvent<any>) => {
  globalThis.currentUser = undefined;
  for (const identifyUserFunction of identifyUserFunctions) {
    const user = await identifyUserFunction(event);
    if (user) {
      user.vaylaKayttajaTyyppi = adaptKayttajaTyyppi(user.roolit);
      globalThis.currentUser = user;
      log.info("Current user:", globalThis.currentUser);
      return;
    }
  }
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
  globalThis.currentUser = kayttaja;
  if (globalThis.currentUser) {
    log.info("Current user:", globalThis.currentUser);
  } else {
    log.info("Anonymous user");
  }
}

export function getVaylaUser(): Kayttaja {
  if (!globalThis.currentUser) {
    throw new IllegalAccessError("Väylä-kirjautuminen puuttuu");
  }
  return globalThis.currentUser;
}

function requireVaylaUser(): Kayttaja {
  if (!globalThis.currentUser) {
    throw new IllegalAccessError("Väylä-kirjautuminen puuttuu");
  }
  return globalThis.currentUser;
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
  if (!hasPermissionLuonti()) {
    throw new IllegalAccessError("Vain L ja A tunnuksella voi luoda uusia projekteja");
  }
}

export function hasPermissionLuonti(kayttaja: Kayttaja = requireVaylaUser()) {
  return isHassuAdmin(kayttaja) || isAorL(kayttaja);
}

export function requirePermissionMuokkaa(projekti: DBProjekti) {
  const kayttaja = requireVaylaUser();
  if (isHassuAdmin(kayttaja)) {
    return;
  }
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
  return account?.vaylaKayttajaTyyppi === VaylaKayttajaTyyppi.A_TUNNUS;
}

function isLTunnus(account: Kayttaja) {
  return account?.vaylaKayttajaTyyppi === VaylaKayttajaTyyppi.L_TUNNUS;
}
