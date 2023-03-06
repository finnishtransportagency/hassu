import { AppSyncResolverEvent } from "aws-lambda/trigger/appsync-resolver";
import { validateJwtToken } from "./validatejwttoken";
import { config } from "../config";
import { auditLog, log } from "../logger";
import { IllegalAccessError } from "../error/IllegalAccessError";
import { KayttajaTyyppi, NykyinenKayttaja } from "../../../common/graphql/apiModel";
import { DBProjekti } from "../database/model";
import { createSignedCookies } from "./signedCookie";
import { apiConfig } from "../../../common/abstractApi";
import { isAorL } from "../util/userUtil";
import { NoHassuAccessError } from "../error/NoHassuAccessError";
import { NoVaylaAuthenticationError } from "../error/NoVaylaAuthenticationError";

function parseRoles(roles: string): string[] | undefined {
  return roles
    ? roles
        .replace("\\", "")
        .split(",")
        .map((s) => {
          const s1 = s.split("/").pop();
          if (s1) {
            return s1;
          }
          // tsc fails if undefined is returned here
          return "";
        })
        .filter((s) => s)
    : undefined;
}

export type KayttajaPermissions = {
  roolit?: string[] | null;
};

export type IdentifyUserFunc = (event: AppSyncResolverEvent<unknown>) => Promise<NykyinenKayttaja | undefined>;

const identifyLoggedInVaylaUser: IdentifyUserFunc = async (event: AppSyncResolverEvent<unknown>) => {
  const headers = event.request?.headers;

  if (headers && headers["x-iam-accesstoken"] && config.cognitoURL) {
    const jwt = await validateJwtToken(headers["x-iam-accesstoken"], headers["x-iam-data"] || "", config.cognitoURL);
    if (jwt) {
      const roolit = parseRoles(jwt["custom:rooli"]);
      const user: NykyinenKayttaja = {
        __typename: "NykyinenKayttaja",
        etunimi: jwt["custom:etunimi"],
        sukunimi: jwt["custom:sukunimi"],
        uid: jwt["custom:uid"],
        roolit,
      };
      if (!isHassuKayttaja(user)) {
        const msg = "Ei käyttöoikeutta palveluun " + JSON.stringify(user);
        auditLog.warn(msg);
        throw new NoHassuAccessError(msg);
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

export const identifyUser = async (event: AppSyncResolverEvent<unknown>): Promise<void> => {
  (globalThis as any).currentUser = undefined;
  for (const identifyUserFunction of identifyUserFunctions) {
    const user = await identifyUserFunction(event);
    if (user) {
      (globalThis as any).currentUser = user;
      return;
    }
  }
};

export const installIdentifyUserFunction = (func: IdentifyUserFunc): void => {
  identifyUserFunctions.push(func);
};

if (process.env.USER_IDENTIFIER_FUNCTIONS) {
  import(process.env.USER_IDENTIFIER_FUNCTIONS);
}

/**
 * For test use only
 * @param kayttaja
 */
export function identifyMockUser(kayttaja?: NykyinenKayttaja): void {
  (globalThis as any).currentUser = kayttaja;
  if ((globalThis as any).currentUser) {
    log.debug("Mock user", { user: (globalThis as any).currentUser });
  } else {
    log.debug("Anonymous user");
  }
}

export function getVaylaUser(): NykyinenKayttaja | undefined {
  return (globalThis as any).currentUser;
}

export function requireVaylaUser(): NykyinenKayttaja {
  if (!(globalThis as any).currentUser) {
    const msg = "Väylä-kirjautuminen puuttuu";
    auditLog.warn(msg);
    throw new NoVaylaAuthenticationError(msg);
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

export function requirePermissionLuku(): NykyinenKayttaja {
  return requireVaylaUser();
}

export function requirePermissionLuonti(): void {
  if (!hasPermissionLuonti()) {
    const msg = "Vain L ja A tunnuksella voi luoda uusia projekteja";
    auditLog.warn(msg);
    throw new IllegalAccessError(msg);
  }
}

export function hasPermissionLuonti(kayttaja = requireVaylaUser()): boolean {
  return !!kayttaja;
}

export function requirePermissionMuokkaa(projekti: DBProjekti): NykyinenKayttaja {
  const kayttaja = requireVaylaUser();
  if (isHassuAdmin(kayttaja)) {
    return kayttaja;
  }
  // Current user must be added into the projekti
  if (projekti.kayttoOikeudet.filter((user) => user.kayttajatunnus === kayttaja.uid).pop()) {
    return kayttaja;
  } else {
    const msg = "Sinulla ei ole käyttöoikeutta muokata projektia";
    auditLog.warn(msg);
    throw new IllegalAccessError(msg);
  }
}

export function requireAdmin(description?: string): NykyinenKayttaja {
  const kayttaja = requireVaylaUser();
  if (isHassuAdmin(kayttaja)) {
    return kayttaja;
  }
  const msg = "Sinulla ei ole admin-oikeuksia" + (description ? " (" + description + ")" : "");
  auditLog.warn(msg);
  throw new IllegalAccessError(msg);
}

function isCurrentUserVirkamiesAndTypeOf(projekti: DBProjekti, tyyppi: KayttajaTyyppi): boolean {
  const kayttaja = requireVaylaUser();
  if (isHassuAdmin(kayttaja)) {
    return true;
  }
  const projektiUser = projekti.kayttoOikeudet.filter((user) => user.kayttajatunnus === kayttaja.uid && user.tyyppi == tyyppi).pop();
  return !!projektiUser && isAorL(projektiUser.kayttajatunnus);
}

export function requireOmistaja(projekti: DBProjekti,reason:string): NykyinenKayttaja {
  const isOmistaja =
    isCurrentUserVirkamiesAndTypeOf(projekti, KayttajaTyyppi.PROJEKTIPAALLIKKO) ||
    isCurrentUserVirkamiesAndTypeOf(projekti, KayttajaTyyppi.VARAHENKILO);
  if (isOmistaja) {
    return requireVaylaUser();
  }
  const msg = "Et ole projektin omistaja ("+reason+")";
  auditLog.warn(msg);
  throw new IllegalAccessError(msg);
}
