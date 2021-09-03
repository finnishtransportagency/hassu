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

## Riippuvuudet

### AWS Systems Manager Parameter Store

| Parametrin nimi              | Kuvaus                                                     |
| ---------------------------- | ---------------------------------------------------------- |
| /CloudfrontCertificateId/dev | Cloudfront distribuution sertifikaatin ID Dev-ympäristössä |
