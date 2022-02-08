import { AppSyncResolverEvent } from "aws-lambda/trigger/appsync-resolver";
import { validateJwtToken } from "./validatejwttoken";
import { config } from "../config";
import { log } from "../logger";
import { IllegalAccessError } from "../error/IllegalAccessError";
import { NykyinenKayttaja, VaylaKayttajaTyyppi } from "../../../common/graphql/apiModel";
import { DBProjekti } from "../database/model/projekti";
import { createSignedCookies } from "./signedCookie";
import { apiConfig } from "../../../common/abstractApi";
import { JwtPayload } from "jsonwebtoken";

function parseRoles(roles: string): string[] | undefined {
  return roles
    ? (roles
        .replace("\\", "")
        .split(",")
        .map((s) => s.split("/").pop()) as string[])
    : undefined;
}

function adaptKayttajaTyyppi(roolit: string[] | null | undefined): VaylaKayttajaTyyppi | undefined {
  const roleToTypeMap = {
    Atunnukset: VaylaKayttajaTyyppi.A_TUNNUS,
    Ltunnukset: VaylaKayttajaTyyppi.L_TUNNUS,
    LXtunnukset: VaylaKayttajaTyyppi.LX_TUNNUS,
  } as Record<string, VaylaKayttajaTyyppi>;
  if (roolit) {
    for (const role of roolit) {
      const type = roleToTypeMap[role];
      if (type) {
        return type;
      }
    }
  }
  return;
}

export type KayttajaPermissions = {
  vaylaKayttajaTyyppi?: VaylaKayttajaTyyppi | null;
  roolit?: string[] | null;
};

export type IdentifyUserFunc = (event: AppSyncResolverEvent<any>) => Promise<NykyinenKayttaja | undefined>;

const identifyLoggedInVaylaUser: IdentifyUserFunc = async (event: AppSyncResolverEvent<any>) => {
  const headers = event.request?.headers;

  if (headers && headers["x-iam-accesstoken"] && config.cognitoURL) {
    const jwt = (await validateJwtToken(
      headers["x-iam-accesstoken"],
      headers["x-iam-data"] || "",
      config.cognitoURL
    )) as JwtPayload;
    if (jwt) {
      const roolit = parseRoles(jwt["custom:rooli"]);
      const user: NykyinenKayttaja = {
        __typename: "NykyinenKayttaja",
        etuNimi: jwt["custom:etunimi"],
        sukuNimi: jwt["custom:sukunimi"],
        uid: jwt["custom:uid"],
        roolit,
      };
      if (!isHassuKayttaja(user)) {
        throw new IllegalAccessError("Ei käyttöoikeutta palveluun " + JSON.stringify(user));
      }
      // Create signed cookies only for nykyinenKayttaja operation
      if (event.info?.fieldName === apiConfig.nykyinenKayttaja.name) {
        user.keksit = await createSignedCookies();
      }
      return user;
    }
  }
};

const identifyUserFunctions = [identifyLoggedInVaylaUser];

export const identifyUser = async (event: AppSyncResolverEvent<any>) => {
  (globalThis as any).currentUser = undefined;
  for (const identifyUserFunction of identifyUserFunctions) {
    const user = await identifyUserFunction(event);
    if (user) {
      user.vaylaKayttajaTyyppi = adaptKayttajaTyyppi(user.roolit);
      (globalThis as any).currentUser = user;
      return;
    }
  }
};

export const installIdentifyUserFunction = (func: IdentifyUserFunc) => identifyUserFunctions.push(func);

if (process.env.USER_IDENTIFIER_FUNCTIONS) {
  import(process.env.USER_IDENTIFIER_FUNCTIONS);
}

/**
 * For test use only
 * @param kayttaja
 */
export function identifyMockUser(kayttaja?: NykyinenKayttaja) {
  (globalThis as any).currentUser = kayttaja;
  if ((globalThis as any).currentUser) {
    log.info("Mock user", { user: (globalThis as any).currentUser });
  } else {
    log.info("Anonymous user");
  }
}

export function getVaylaUser(): NykyinenKayttaja | undefined {
  return (globalThis as any).currentUser;
}

export function requireVaylaUser(): NykyinenKayttaja {
  if (!(globalThis as any).currentUser) {
    throw new IllegalAccessError("Väylä-kirjautuminen puuttuu");
  }
  return (globalThis as any).currentUser;
}

// Role: admin
function isHassuAdmin(kayttaja: KayttajaPermissions) {
  return kayttaja.roolit?.includes("hassu_admin");
}

// Role: kayttaja
function isHassuKayttaja(kayttaja: KayttajaPermissions) {
  return kayttaja.roolit?.includes("hassu_kayttaja") || isHassuAdmin(kayttaja);
}

export function isAorL(account: KayttajaPermissions) {
  return isATunnus(account) || isLTunnus(account);
}

export function requirePermissionLuku(): NykyinenKayttaja {
  return requireVaylaUser();
}

export function requirePermissionLuonti() {
  if (!hasPermissionLuonti()) {
    throw new IllegalAccessError("Vain L ja A tunnuksella voi luoda uusia projekteja");
  }
}

export function hasPermissionLuonti(kayttaja: KayttajaPermissions = requireVaylaUser()) {
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

function isATunnus(account: KayttajaPermissions) {
  return account?.vaylaKayttajaTyyppi === VaylaKayttajaTyyppi.A_TUNNUS;
}

function isLTunnus(account: KayttajaPermissions) {
  return account?.vaylaKayttajaTyyppi === VaylaKayttajaTyyppi.L_TUNNUS;
}
