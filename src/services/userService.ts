import { NextRouter } from "next/router";
import { useEffect } from "react";

export function useStoreKansalaisUserAuthentication(router: NextRouter) {
  const path = router.asPath;
  useEffect(() => { 
    if (path && path.includes("?code=")) {
      const paramsStr = path.substring(path.indexOf("?") + 1);
      const params = new URLSearchParams(paramsStr);
      const code = params.get("code");
      const state = params.get("state") ?? "";
      if (code) {
        router.push("/api/token?code=" + code + "&state=" + state + "&client_id=" + process.env.SUOMI_FI_USERPOOL_CLIENT_ID + "&redirect_uri=" + getAppDomainUri());
      }
    }
  }, [router, path]);
}

function getAppDomainUri() {
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000/";
  } else {
    return "https://" + process.env.FRONTEND_DOMAIN_NAME + "/";
  }
}

function getKeycoakLogoutUri() {
  return getAppDomainUri() + "api/slo";
}

export function getSuomiFiAuthenticationURL(state?: string): string | undefined {
  const domain = process.env.SUOMI_FI_COGNITO_DOMAIN;
  const clientId = process.env.SUOMI_FI_USERPOOL_CLIENT_ID;
  if (domain && clientId) {
    const url = new URL(domain);
    url.pathname = "/oauth2/authorize";
    url.searchParams.set("identity_provider", "Suomi.fi");
    url.searchParams.set("redirect_uri", getAppDomainUri());
    url.searchParams.set("response_type", "CODE");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("scope", "email openid profile");
    url.searchParams.set("state", state ?? "");
    return url.toString();
  }
}

export function getSuomiFiLogoutURL(): string | undefined {
  const domain = process.env.SUOMI_FI_COGNITO_DOMAIN;
  const clientId = process.env.SUOMI_FI_USERPOOL_CLIENT_ID;
  const keycloakRedirectUri = getKeycoakLogoutUri();

  if (domain && clientId) {
    const url = new URL(domain);
    url.pathname = "/logout";
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("logout_uri", keycloakRedirectUri);
    return url.toString();
  }
}
