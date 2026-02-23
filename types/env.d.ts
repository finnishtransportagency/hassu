// Nämä muuttujat näkyvät selaimessa (window.__ENV)
const PUBLIC_ENV_KEYS = [
  "VERSION",
  "ENVIRONMENT",
  "VAYLA_EXTRANET_URL",
  "VELHO_BASE_URL",
  "AJANSIIRTO_SALLITTU",
  "REACT_APP_API_URL",
  "REACT_APP_API_KEY",
  "FRONTEND_DOMAIN_NAME",
  "KEYCLOAK_CLIENT_ID",
  "KEYCLOAK_DOMAIN",
  "EVK_ACTIVATION_DATE",
] as const;

export type PublicEnv = {
  [K in (typeof PUBLIC_ENV_KEYS)[number]]: string;
};

declare global {
  interface Window {
    __ENV: PublicEnv;
  }
}
