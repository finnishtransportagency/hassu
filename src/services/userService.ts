import { getPublicEnv } from "src/util/env";

function getAppDomainUri() {
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000/";
  } else {
    return "https://" + getPublicEnv("FRONTEND_DOMAIN_NAME") + "/";
  }
}

export function getSuomiFiAuthenticationURL(state?: string): string | undefined {
  const domain = getPublicEnv("KEYCLOAK_DOMAIN");
  const clientId = getPublicEnv("KEYCLOAK_CLIENT_ID");
  if (domain && clientId) {
    const url = new URL(domain);
    url.pathname = "/keycloak/auth/realms/suomifi/protocol/openid-connect/auth";
    url.searchParams.set("redirect_uri", getAppDomainUri() + "api/token");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("scope", "email openid profile");
    url.searchParams.set("state", state ?? "");
    return url.toString();
  }
}

export function getSuomiFiLogoutURL(): string {
  return getAppDomainUri() + "api/slo";
}
