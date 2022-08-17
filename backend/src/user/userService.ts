import { AppSyncResolverEvent } from "aws-lambda/trigger/appsync-resolver";
import { validateJwtToken } from "./validatejwttoken";
import { config } from "../config";
import { log } from "../logger";
import { IllegalAccessError } from "../error/IllegalAccessError";
import { NykyinenKayttaja, ProjektiRooli, VaylaKayttajaTyyppi } from "../../../common/graphql/apiModel";
import { DBProjekti } from "../database/model/projekti";
import { createSignedCookies } from "./signedCookie";
import { apiConfig } from "../../../common/abstractApi";

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
}

export type KayttajaPermissions = {
  vaylaKayttajaTyyppi?: VaylaKayttajaTyyppi | null;
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
      user.vaylaKayttajaTyyppi = adaptKayttajaTyyppi(user.roolit);
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

export function isAorL(account: KayttajaPermissions): boolean {
  return isATunnus(account) || isLTunnus(account);
}

export function requirePermissionLuku(): NykyinenKayttaja {
  return requireVaylaUser();
}

export function requirePermissionLuonti(): void {
  if (!hasPermissionLuonti()) {
    throw new IllegalAccessError("Vain L ja A tunnuksella voi luoda uusia projekteja");
  }
}

export function hasPermissionLuonti(kayttaja: KayttajaPermissions = requireVaylaUser()): boolean {
  return isHassuAdmin(kayttaja) || isAorL(kayttaja);
}

export function requirePermissionMuokkaa(projekti: DBProjekti): NykyinenKayttaja {
  const kayttaja = requireVaylaUser();
  if (isHassuAdmin(kayttaja)) {
    return kayttaja;
  }
  if (!isAorL(kayttaja)) {
    throw new IllegalAccessError("Vain L ja A tunnuksella voi muokata projekteja");
  }
  // Current user must be added into the projekti with any role
  const projektiUser = projekti.kayttoOikeudet.filter((user) => user.kayttajatunnus === kayttaja.uid).pop();
  if (!projektiUser) {
    throw new IllegalAccessError("Sinulla ei ole käyttöoikeutta muokata projektia");
  }
  return kayttaja;
}

export function requireAdmin(description?:string): NykyinenKayttaja {
  const kayttaja = requireVaylaUser();
  if (isHassuAdmin(kayttaja)) {
    return kayttaja;
  }
  throw new IllegalAccessError("Sinulla ei ole admin-oikeuksia" + (description ? " (" + description + ")" : ""));
}

export function requireProjektiPaallikko(projekti: DBProjekti): NykyinenKayttaja {
  const kayttaja = requireVaylaUser();
  if (isHassuAdmin(kayttaja)) {
    return kayttaja;
  }
  // Current user must be added into the projekti with projektipaallikko role
  const projektiUser = projekti.kayttoOikeudet
    .filter((user) => user.kayttajatunnus === kayttaja.uid && user.rooli == ProjektiRooli.PROJEKTIPAALLIKKO)
    .pop();
  if (!projektiUser) {
    throw new IllegalAccessError(
      "Sinulla ei ole käyttöoikeutta muokata projektia, koska et ole projektin projektipäällikkö."
    );
  }
  return kayttaja;
}

function isATunnus(account: KayttajaPermissions) {
  return account?.vaylaKayttajaTyyppi === VaylaKayttajaTyyppi.A_TUNNUS;
}

function isLTunnus(account: KayttajaPermissions) {
  return account?.vaylaKayttajaTyyppi === VaylaKayttajaTyyppi.L_TUNNUS;
}
