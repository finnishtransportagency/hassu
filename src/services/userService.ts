export function storeKansalaisUserAuthentication(hash: string) {
  if (hash && hash.includes("#")) {
    const paramsStr = hash.substring(hash.indexOf("#") + 1);
    const params = new URLSearchParams(paramsStr);
    const accessToken = params.get("access_token");
    const idToken = params.get("id_token");
    const tokenType = params.get("token_type");
    const expiresIn = params.get("expires_in");
    if (accessToken && idToken && tokenType && expiresIn) {
      // Store access token to cookie that expires in "expiresId" seconds
      const expires = new Date(Date.now() + parseInt(expiresIn) * 1000);
      // set cookie as Secure AND SameSite=Strict
      const cookie = `x-vls-access-token=${accessToken};expires=${expires.toUTCString()};path=/;Secure;SameSite=Strict`;
      document.cookie = cookie;
      return cookie;
    }
  }
}

export function getSuomiFiAuthenticationURL(): string | undefined {
  const domain = process.env.SUOMI_FI_COGNITO_DOMAIN;
  const clientId = process.env.SUOMI_FI_USERPOOL_CLIENT_ID;
  if (domain && clientId) {
    const url = new URL(domain);
    url.pathname = "/oauth2/authorize";
    url.searchParams.set("identity_provider", "Suomi.fi");
    url.searchParams.set("redirect_uri", "https://" + process.env.FRONTEND_DOMAIN_NAME + "/");
    url.searchParams.set("response_type", "TOKEN");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("scope", "email openid");
    return url.toString();
  }
}

export function getSuomiFiLogoutURL(): string | undefined {
  const domain = process.env.SUOMI_FI_COGNITO_DOMAIN;
  const clientId = process.env.SUOMI_FI_USERPOOL_CLIENT_ID;
  if (domain && clientId) {
    const url = new URL(domain);
    url.pathname = "/logout";
    url.searchParams.set("logout_uri", "https://" + process.env.FRONTEND_DOMAIN_NAME + "/");
    url.searchParams.set("client_id", clientId);
    return url.toString();
  }
}
