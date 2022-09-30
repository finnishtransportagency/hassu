import { AppSyncResolverEvent } from "aws-lambda/trigger/appsync-resolver";
import { validateJwtToken } from "./validatejwttoken";
import { config } from "../config";
import { log } from "../logger";
import { IllegalAccessError } from "../error/IllegalAccessError";
import { KayttajaTyyppi, NykyinenKayttaja } from "../../../common/graphql/apiModel";
import { DBProjekti } from "../database/model";
import { createSignedCookies } from "./signedCookie";
import { apiConfig } from "../../../common/abstractApi";
import { isAorL } from "../util/userUtil";

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

export function requirePermissionLuku(): NykyinenKayttaja {
  return requireVaylaUser();
}

export function requirePermissionLuonti(): void {
  if (!hasPermissionLuonti()) {
    throw new IllegalAccessError("Vain L ja A tunnuksella voi luoda uusia projekteja");
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
    throw new IllegalAccessError("Sinulla ei ole käyttöoikeutta muokata projektia");
  }
}

export function requireAdmin(description?: string): NykyinenKayttaja {
  const kayttaja = requireVaylaUser();
  if (isHassuAdmin(kayttaja)) {
    return kayttaja;
  }
  throw new IllegalAccessError("Sinulla ei ole admin-oikeuksia" + (description ? " (" + description + ")" : ""));
}

function isCurrentUserVirkamiesAndTypeOf(projekti: DBProjekti, tyyppi: KayttajaTyyppi): boolean {
  const kayttaja = requireVaylaUser();
  if (isHassuAdmin(kayttaja)) {
    return true;
  }
  const projektiUser = projekti.kayttoOikeudet.filter((user) => user.kayttajatunnus === kayttaja.uid && user.tyyppi == tyyppi).pop();
  return !!projektiUser && isAorL(projektiUser.kayttajatunnus);
}

export function requireOmistaja(projekti: DBProjekti): NykyinenKayttaja {
  const isOmistaja =
    isCurrentUserVirkamiesAndTypeOf(projekti, KayttajaTyyppi.PROJEKTIPAALLIKKO) ||
    isCurrentUserVirkamiesAndTypeOf(projekti, KayttajaTyyppi.VARAHENKILO);
  if (isOmistaja) {
    return requireVaylaUser();
  }
  throw new IllegalAccessError("Et ole projektin omistaja");
}
