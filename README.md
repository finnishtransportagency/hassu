# Hassu

## Asentaminen

Kirjaudu komentoriviltä AWS-tilille. Aseta ympäristömuuttuja AWS_PROFILE vastaamaan AWS-sisäänkirjautumistasi. Aseta ympäristömuuttuja ENVIRONMENT vastaamaan ympäristön nimeä mitä asennat.
Asenna riippuvuudet
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
