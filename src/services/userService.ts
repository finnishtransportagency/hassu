function getAppDomainUri() {
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000/";
  } else {
    return "https://" + process.env.FRONTEND_DOMAIN_NAME + "/";
  }
}

export function getSuomiFiAuthenticationURL(state?: string): string | undefined {
  const domain = process.env.KEYCLOAK_DOMAIN;
  const clientId = process.env.KEYCLOAK_CLIENT_ID;
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
