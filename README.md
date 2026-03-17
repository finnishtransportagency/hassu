# Hassu

## Asentaminen työasemalta

Kirjaudu komentoriviltä AWS-tilille. Aseta ympäristömuuttuja AWS_PROFILE vastaamaan AWS-sisäänkirjautumistasi. Aseta
ympäristömuuttuja ENVIRONMENT vastaamaan ympäristön nimeä mitä asennat. Asenna riippuvuudet

```
npm i
```

Generoi luokat GraphQL-skeemasta

```
npm run generate
```

Asenna API

```
npm run deploy:backend
```

Asenna edusta

```
npm run deploy:frontend
```

Rakenna ja asenna sovellus

```
npm run deploy:app
```

## CI/CD pipelinen asentaminen työasemalta

1. Mene siihen git-haaraan josta haluat pipelinen asentaa
2. Aseta AWS_PROFILE ja ENVIRONMENT ympäristömuuttujat
3. `npm run deploy:pipeline`

## Ympäristömuuttujat Next.js sovelluksessa

### Paikallinen kehitys

Ympäristömuuttujat määritellään `.env.local` ja `public/assets/__env.js` tiedostoissa paikallista kehitystä varten. Tiedostot generoidaan automaattisesti kun suoritat:
- `npm run deploy:backend` - kutsuu `npm run setupenvironment` suoraan komennossa
- `npm run deploy:frontend` - kutsuu `postdeploy:frontend` hookissa `npm run setupenvironment`
- `npm run deploy:database` - kutsuu `postdeploy:database` hookissa `npm run setupenvironment`

`setupenvironment` skripti suorittaa `deployment/bin/setupEnvironment.ts` tiedoston, joka:
- Hakee arvot AWS SSM Parameter Storesta ja CloudFormation stack outputeista
- Kirjoittaa palvelinpuolen muuttujat `.env.local` tiedostoon
- Kirjoittaa selainpuolen julkiset muuttujat `public/assets/__env.js` tiedostoon

`__env.js` tiedosto ladataan `_document.tsx`:ssä, mikä mahdollistaa ympäristömuuttujien käytön selainpuolen komponenteissa `getPublicEnv()` funktion avulla.

**Huom:** Sovellus käyttää tällä hetkellä Next.js Pages Routeria. Siirtyminen App Routeriin poistaisi tarpeen `getPublicEnv()` -viritelmälle, koska App Router tukee natiivisti runtime-ympäristömuuttujia ja Server Components -arkkitehtuuria.

### Ympäristömuuttujien käyttö sovelluksessa

Sovelluksessa on kaksi eri tapaa käyttää ympäristömuuttujia riippuen siitä, missä niitä tarvitaan:

#### 1. Palvelinpuolen muuttujat (process.env)

Käytetään **vain palvelinpuolella** (API-reitit, getServerSideProps, backend-logiikka):

```typescript
// Esimerkki API-reitissä tai getServerSideProps:ssa
const dbUrl = process.env.TABLE_PROJEKTI;
const apiKey = process.env.VELHO_PASSWORD;
```

#### 2. Julkiset muuttujat (getPublicEnv)

Käytetään **selainpuolen komponenteissa** jotka renderöidään sekä palvelimella että selaimessa:

```typescript
import { getPublicEnv } from "src/util/env";

const MyComponent = () => {
  const apiUrl = getPublicEnv("REACT_APP_API_URL");
  const velhoUrl = getPublicEnv("VELHO_BASE_URL");
  // ...
};
```

**Miksi getPublicEnv()?** 
- Tarvitaan layout-komponenteissa joissa getServerSideProps ei ole käytettävissä
- Docker-julkaisussa ympäristömuuttujat injektoidaan runtime-vaiheessa `entrypoint.sh` skriptillä `__env.js` tiedostoon
- Mahdollistaa saman Docker-imagen käytön eri ympäristöissä ilman uudelleenrakentamista (build once, deploy many)

**Turvallisuushuomio:** Julkiset muuttujat (getPublicEnv) näkyvät selaimessa ja `__env.js` tiedostossa. Älä koskaan lisää arkaluontoisia tietoja (salasanat, salaiset API-avaimet) julkisiin muuttujiin - käytä niille palvelinpuolen muuttujia (process.env).

### Uuden julkisen ympäristömuuttujan lisääminen

Kun lisäät uuden selainpuolella käytettävän ympäristömuuttujan, tee muutokset seuraaviin tiedostoihin:

**Huom:** Voit tutustua olemassa oleviin muuttujiin katsomalla `types/env.d.ts` (PUBLIC_ENV_KEYS) ja `deployment/lib/setupEnvironment.ts` (HassuSSMParameters) tiedostoja.

1. **Lisää muuttuja AWS SSM Parameter Storeen** (jos muuttuja tulee SSM:stä):
   - Lisää parametri AWS-konsolissa tai CLI:llä polkuun `/<env>/UusiMuuttuja`

2. **Lisää muuttuja `types/env.d.ts` tiedostoon:**
```typescript
const PUBLIC_ENV_KEYS = [
  "VERSION",
  "ENVIRONMENT",
  "UUSI_MUUTTUJA", // Lisää tähän
  // ...
] as const;
```

3. **Lisää muuttuja `deployment/lib/setupEnvironment.ts` tiedostoon:**
   - `HassuSSMParameters` tyyppiin jos muuttuja tulee SSM Parameter Storesta:
```typescript
export type HassuSSMParameters = {
  // ...
  UusiMuuttuja: string;
};
```
   - `getEnvironmentVariablesFromSSM()` funktioon:
```typescript
export async function getEnvironmentVariablesFromSSM(variables?: HassuSSMParameters) {
  return {
    // ...
    UUSI_MUUTTUJA: variables.UusiMuuttuja,
  };
}
```

4. **Lisää muuttuja `deployment/bin/setupEnvironment.ts` tiedostoon:**
   - `env` objektiin `.env.local` tiedostoa varten:
```typescript
let env: Record<string, string> = {
  // ...
  UUSI_MUUTTUJA: environmentVariables.UUSI_MUUTTUJA,
};
```
   - `writePublicEnvFile()` funktioon `__env.js` tiedostoa varten:
```typescript
writePublicEnvFile({
  // ...
  UUSI_MUUTTUJA: environmentVariables.UUSI_MUUTTUJA,
});
```

5. **Lisää muuttuja `deployment/lib/hassu-frontend.ts` tiedostoon:**
   - `containerEnv` objektiin ECS-kontin ympäristömuuttujiin:
```typescript
const containerEnv: { [key: string]: string } = {
  // ...
  UUSI_MUUTTUJA: process.env.UUSI_MUUTTUJA || "",
};
```

6. **Lisää muuttuja `entrypoint.sh` tiedostoon:**
   - Docker-kontti injektoi muuttujan runtime-vaiheessa:
```bash
cat <<EOF > /app/public/assets/__env.js
window.__ENV = {
  VERSION: "$VERSION",
  UUSI_MUUTTUJA: "$UUSI_MUUTTUJA",
  // ...
};
EOF
```

7. **Käytä muuttujaa komponentissa:**
```typescript
import { getPublicEnv } from "src/util/env";

const arvo = getPublicEnv("UUSI_MUUTTUJA");
```

### Troubleshooting

**Ympäristömuuttujat eivät päivity paikallisessa kehityksessä:**
1. Varmista että `npm run switchenv` osoittaa developer-tiliin
2. Suorita `npm run setupenvironment` manuaalisesti
3. Tarkista että muuttuja on lisätty AWS SSM Parameter Storeen
4. Tarkista että `.env.local` ja `public/assets/__env.js` tiedostot ovat päivittyneet
5. Käynnistä kehityspalvelin uudelleen (`npm run dev`)

**Build-aikainen virhe "getPublicEnv() called during static page generation":**
- Ks. [Staattisen generoinnin ongelmat](#staattisen-generoinnin-ongelmat) -osio

### Staattisen generoinnin ongelmat

Jos käytät getPublicEnv() komponentissa joka generoidaan staattisesti build-aikana, saat virheen:

```
✗ [BUILD ERROR] getPublicEnv() called during static page generation
```

**Huom:** Tämä virhe on "best effort" -tyyppinen yritys saada build epäonnistumaan näissä tapauksissa.

**Syy:** next-translate kirjasto generoi sivuista staattisia build-vaiheessa, mikä aiheuttaa ongelman kun ympäristömuuttujia yritetään lukea ajon aikana.

**Ratkaisu:** Käytä jompaa kumpaa seuraavista tavoista:

**Ratkaisu 1:** Aseta sivu palvelinpuolella renderöitäväksi:
```typescript
import { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};
```

**Ratkaisu 2:** Lataa komponentti dynaamisesti ilman SSR:ää:
```typescript
import dynamic from "next/dynamic";

const Breadcrumbs = dynamic(() => import("./Breadcrumbs"), {
  ssr: false,
});
```

**Huom:** Dynaamiset sivut kuten `pages/suunnitelma/[oid]/*.tsx` renderöidään aina ajon aikana, joten ne eivät tarvitse näitä ratkaisuja.


## Riippuvuudet

### AWS Systems Manager Parameter Store

| Parametrin nimi                     | Kuvaus                                                   |
| ----------------------------------- | -------------------------------------------------------- |
| /\<env>/CloudfrontCertificateArn    | Cloudfront distribuution sertifikaatin arn               |
| /\<env>/DMZProxyEndpoint            | Proxyn julkinen URL                                      |
| /\<env>/FrontendDomainName          | Palvelun julkinen URL                                    |
| /\<env>/basicAuthenticationUsername | Testiversion autentikaation käyttäjätunnus               |
| /\<env>/basicAuthenticationPassword | Testiversion autentikaation salasana                     |
| /\<env>/CognitoURL                  | Virkamiestunnistautumisen JWT-tokenien sallittu "issuer" |
| /\<env>/VelhoAuthenticationUrl      | Velhon tunnistautumisen osoite                           |
| /\<env>/VelhoApiUrl                 | Velho-rajapinnan osoite                                  |
| /\<env>/VelhoUsername               | Käyttäjätunnus Velho-integraatioon                       |
| /\<env>/VelhoPassword               | Salasana Velho-integraatioon                             |
