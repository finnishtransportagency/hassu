// Nämä muuttujat näkyvät selaimessa (window.__ENV) JA palvelimella
const PUBLIC_ENV_KEYS = [
    "VERSION_2",
    "ENVIRONMENT_2",
    "VAYLA_EXTRANET_URL",
    "VELHO_BASE_URL",
    "AJANSIIRTO_SALLITTU",
    "REACT_APP_API_URL",
    "REACT_APP_API_KEY",
    "FRONTEND_DOMAIN_NAME",
    "KEYCLOAK_CLIENT_ID",
    "KEYCLOAK_DOMAIN",
    "EVK_ACTIVATION_DATE"
] as const;

// 2. Generoi tyyppi automaattisesti taulukon sisällön perusteella
export type PublicEnv = {
  [K in typeof PUBLIC_ENV_KEYS[number]]: string;
};

const PRIVATE_ENV_KEYS = [
    "TABLE_PROJEKTI",
    "TABLE_LYHYTOSOITE",
    "INTERNAL_BUCKET_NAME",
    "FRONTEND_DOMAIN_NAME",
    "VELHO_API_URL",
    "VELHO_AUTH_URL",
    "EVENT_SQS_URL",
    "HYVAKSYMISESITYS_SQS_URL",
    "ASIANHALLINTA_SQS_URL",
    "SEARCH_DOMAIN",
    "VELHO_USERNAME",
    "VELHO_PASSWORD"
] as const
// Nämä muuttujat ovat VAIN palvelimella (process.env)
export type PrivateEnv = {
  [K in typeof PRIVATE_ENV_KEYS[number]]: string;
} & {
  PUBLIC_BUCKET_NAME: string | undefined;
  YLLAPITO_BUCKET_NAME: string | undefined;
};

// Yhdistetty tyyppi palvelinpuolen käyttöön
export type FullEnv = PublicEnv & PrivateEnv;

declare global {
  interface Window {
    __ENV: PublicEnv;
  }
}
