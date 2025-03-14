import { AppSyncResolverEvent } from "aws-lambda/trigger/appsync-resolver";
import { validateJwtToken } from "./validatejwttoken";
import { config } from "../config";
import { auditLog, log } from "../logger";
import { IllegalAccessError, NoHassuAccessError, NoVaylaAuthenticationError } from "hassu-common/error";
import { KayttajaTyyppi, NykyinenKayttaja, SuomifiKayttaja } from "hassu-common/graphql/apiModel";
import { DBProjekti } from "../database/model";
import { createSignedCookies } from "./signedCookie";
import { apiConfig } from "hassu-common/abstractApi";
import { isAorLTunnus } from "hassu-common/util/isAorLTunnus";
import { parameters } from "../aws/parameters";
import fetch from "cross-fetch";
import { SuomiFiCognitoKayttaja } from "./suomiFiCognitoKayttaja";
import { invokeLambda } from "../aws/lambda";

function parseRoles(roles?: string): string[] | undefined {
  if (!roles) {
    return undefined;
  }
  function parseRole(s: string) {
    const s1 = s.split("/").pop();
    if (s1) {
      return s1;
    }
    // tsc fails if undefined is returned here
    return "";
  }
  try {
    return JSON.parse(roles)
      .map(parseRole)
      .filter((s: string) => s);
  } catch (e) {
    return roles
      .replace("\\", "")
      .split(",")
      .map(parseRole)
      .filter((s) => s);
  }
}

export type KayttajaPermissions = {
  roolit?: string[] | null;
};

export type IdentifyUserFunc = (event: AppSyncResolverEvent<unknown>) => Promise<NykyinenKayttaja | SuomiFiCognitoKayttaja | undefined>;

const identifyLoggedInVaylaUser: IdentifyUserFunc = async (event: AppSyncResolverEvent<unknown>): Promise<NykyinenKayttaja | undefined> => {
  const headers = event.request?.headers;

  if (headers?.["x-iam-accesstoken"] && config.cognitoURL) {
    const jwt = await validateJwtToken(headers["x-iam-accesstoken"], headers["x-iam-data"] ?? "", config.cognitoURL);
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
      if (event.info?.fieldName === apiConfig.nykyinenKayttaja.name && !config.isInTest) {
        user.keksit = await createSignedCookies();
      }
      return user;
    }
  }
};

const identifyLoggedInKansalainen = async (event: AppSyncResolverEvent<unknown>): Promise<SuomiFiCognitoKayttaja | undefined> => {
  const accessToken = event.request?.headers["x-vls-access-token"];
  if (!accessToken) {
    return;
  }
  let keycloakUrl: string | undefined;
  try {
    keycloakUrl = await parameters.getKeycloakPrivateDomain();
  } catch (e) {
    log.error(e);
  }
  if (!keycloakUrl) {
    log.error("Suomi.fi Keycloak url not found");
    return;
  }
  const userPoolUrl = new URL(keycloakUrl);
  userPoolUrl.pathname = "/keycloak/auth/realms/suomifi/protocol/openid-connect/userinfo";
  const response = await fetch(userPoolUrl.toString(), {
    headers: {
      Authorization: "Bearer " + accessToken,
    },
  });
  if (response.status === 200) {
    const body = await response.json();
    const user: SuomiFiCognitoKayttaja = {
      "custom:hetu": body.hetu,
      "custom:lahiosoite": body.lahiosoite,
      "custom:postinumero": body.postinumero,
      "custom:postitoimipaikka": body.postitoimipaikka,
      "custom:ulkomainenkunta": body.ulkomainenkunta,
      "custom:ulkomainenlahiosoite": body.ulkomainenlahiosoite,
      "custom:maakoodi": body.maakoodi,
      email: body.email,
      email_verified: body.email_verified,
      family_name: body.family_name,
      given_name: body.given_name,
      sub: body.sub,
      username: body.preferred_username,
    };
    setCurrentSuomifiUserToGlobal(user);
  } else {
    log.error("Suomi.fi tietojen haku epäonnistui", {
      statusText: response.statusText,
      status: response.status,
      headers: response.headers,
      body: await response.text(),
    });
  }
  return undefined;
};

const identifyUserFunctions = [identifyLoggedInVaylaUser, identifyLoggedInKansalainen];

function setCurrentVaylaUserToGlobal(user: NykyinenKayttaja | undefined) {
  (globalThis as any).currentUser = user;
}

function setCurrentSuomifiUserToGlobal(user: SuomiFiCognitoKayttaja | undefined) {
  (globalThis as any).currentSuomifiUser = user;
}

export function getSuomiFiCognitoKayttaja(): SuomiFiCognitoKayttaja | undefined {
  return (globalThis as any).currentSuomifiUser;
}

export async function getSuomiFiKayttaja(): Promise<SuomifiKayttaja | undefined> {
  const suomifiEnabled = await parameters.isSuomiFiIntegrationEnabled();
  const suomifiViestitEnabled = await parameters.isSuomiFiViestitIntegrationEnabled();
  if (suomifiEnabled) {
    const cognitoKayttaja = getSuomiFiCognitoKayttaja();
    if (cognitoKayttaja) {
      return {
        __typename: "SuomifiKayttaja",
        suomifiEnabled,
        suomifiViestitEnabled,
        tunnistautunut: true,
        email: cognitoKayttaja.email,
        etunimi: cognitoKayttaja.given_name,
        sukunimi: cognitoKayttaja.family_name,
        osoite: cognitoKayttaja["custom:lahiosoite"] ?? cognitoKayttaja["custom:ulkomainenlahiosoite"],
        postinumero: cognitoKayttaja["custom:postinumero"],
        postitoimipaikka: cognitoKayttaja["custom:postitoimipaikka"] ?? cognitoKayttaja["custom:ulkomainenkunta"],
        maakoodi: cognitoKayttaja["custom:maakoodi"],
        kayttajaSuomifiViestitEnabled: await haeSuomifiKayttajaViestitEnabled(cognitoKayttaja),
      };
    }
  }
  return {
    __typename: "SuomifiKayttaja",
    tunnistautunut: false,
    suomifiEnabled,
    suomifiViestitEnabled,
    kayttajaSuomifiViestitEnabled: false,
  };
}

export const identifyUser = async (event: AppSyncResolverEvent<unknown>): Promise<void> => {
  setCurrentVaylaUserToGlobal(undefined);
  setCurrentSuomifiUserToGlobal(undefined);
  for (const identifyUserFunction of identifyUserFunctions) {
    const user = await identifyUserFunction(event);
    if ((user as NykyinenKayttaja)?.__typename === "NykyinenKayttaja") {
      setCurrentVaylaUserToGlobal(user as NykyinenKayttaja);
      return;
    } else if ((user as SuomiFiCognitoKayttaja)?.sub) {
      setCurrentSuomifiUserToGlobal(user as SuomiFiCognitoKayttaja);
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

async function haeSuomifiKayttajaViestitEnabled(cognitoKayttaja: SuomiFiCognitoKayttaja): Promise<boolean> {
  return !!(await invokeLambda("hassu-suomifi-" + config.env, true, JSON.stringify({ hetu: cognitoKayttaja["custom:hetu"] })));
}

/**
 * For test use only
 * @param kayttaja
 */
export function identifyMockUser(kayttaja?: NykyinenKayttaja): void {
  setCurrentVaylaUserToGlobal(kayttaja);
  const vaylaUser = getVaylaUser();
  if (vaylaUser) {
    log.debug("Mock user", { user: vaylaUser });
  } else {
    log.debug("Anonymous user");
  }
}

export function getVaylaUser(): NykyinenKayttaja | undefined {
  return (globalThis as any).currentUser;
}

export function requireVaylaUser(): NykyinenKayttaja {
  const vaylaUser = getVaylaUser();
  if (!vaylaUser) {
    const msg = "Väylä-kirjautuminen puuttuu";
    auditLog.warn(msg);
    throw new NoVaylaAuthenticationError(msg);
  }
  return vaylaUser;
}

// Role: admin
function isHassuAdmin(kayttaja: KayttajaPermissions) {
  return kayttaja.roolit?.includes("hassu_admin");
}

// Role: kayttaja
function isHassuKayttaja(kayttaja: KayttajaPermissions) {
  return kayttaja.roolit?.includes("hassu_kayttaja") ?? isHassuAdmin(kayttaja);
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
  return !!projektiUser && isAorLTunnus(projektiUser.kayttajatunnus);
}

export function requireOmistaja(projekti: DBProjekti, reason: string): NykyinenKayttaja {
  const isOmistaja =
    isCurrentUserVirkamiesAndTypeOf(projekti, KayttajaTyyppi.PROJEKTIPAALLIKKO) ||
    isCurrentUserVirkamiesAndTypeOf(projekti, KayttajaTyyppi.VARAHENKILO);
  if (isOmistaja) {
    return requireVaylaUser();
  }
  const msg = "Et ole projektin omistaja (" + reason + ")";
  auditLog.warn(msg);
  throw new IllegalAccessError(msg);
}
