# Amazon Q – Projektikohtaiset ohjeet

## Projektin yleiskuvaus

Hassu on AWS-pohjainen sovellus, joka koostuu Next.js-frontendistä (Pages Router), AWS CDK -infrastruktuurista ja backend-palveluista. Projekti käyttää TypeScriptiä kaikkialla.

## Kieli

- Koodikommentit ja muuttujanimet englanniksi

## Arkkitehtuuri

- Frontend: Next.js (Pages Router)
- Infra: AWS CDK (TypeScript)
- Backend: TypeScript, DynamoDB
- Testit: ts-mocha + chai + sinon (backend), Jest (frontend)

## Koodauskäytännöt

- Noudata olemassa olevia koodaustyylejä ja -käytäntöjä
- Käytä projektin ESLint-konfiguraatiota
- Älä lisää uusia riippuvuuksia ilman perustelua

## Ympäristömuuttujat

- Palvelinpuolella: `process.env.MUUTTUJA`
- Selainpuolella: `getPublicEnv("MUUTTUJA")`
- Uuden julkisen ympäristömuuttujan lisääminen vaatii muutoksia useaan tiedostoon – katso README.md

## Turvallisuus

- Älä koskaan sisällytä salaisuuksia, tunnuksia tai avaimia koodiin
- Arkaluontoiset arvot haetaan AWS SSM Parameter Storesta
- Julkisiin ympäristömuuttujiin (getPublicEnv) ei saa laittaa arkaluontoisia tietoja
