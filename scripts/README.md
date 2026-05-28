<!-- Contains code generated or recommended by Amazon Q -->

# scripts/

Apuskriptejä debuggaukseen, selvityksiin, ylläpitoon ja muihin ad-hoc-tehtäviin. Skriptit ovat read-only ellei toisin mainita.

## Saatavilla olevat skriptit

| Skripti                     | Kuvaus                                                                                 | Käyttö                                                                                                             |
| --------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `recreateMuistutusEmail.ts` | Luo ja tulostaa muistutussähköpostit (kirjaamo + valinnaisesti kuittaus kansalaiselle) | `npx ts-node --project scripts/tsconfig.json scripts/recreateMuistutusEmail.ts <oid> <muistuttajaId> [--kuittaus]` |
| `restoreAttribute.ts`       | Palauta yksittäinen attribuutti DynamoDB:hen                                           | `npm run restore:attribute -- <bucket> <export-prefix> <taulu> <partition-key> <attribuutti> --execute`            |
| `importDynamodbExports.ts`  | Tuo DynamoDB:hen sieltä aiemmin exportattu item                                        | `npm run import:dynamodb -- <bucket> <export-prefix> <taulu> <partition-key> --execute`                            |

## Uuden skriptin lisääminen

1. Luo uusi skripti tähän hakemistoon
2. TypeScript-skripteille käytä `scripts/tsconfig.json`: `npx ts-node --project scripts/tsconfig.json scripts/<skripti>.ts`
3. Jos tarvitset importteja muista hakemistoista (esim. `deployment/`), lisää polku `scripts/tsconfig.json` tiedoston `include`-taulukkoon

### Käytännöt

- Dokumentoi skriptin alussa mitä skripti tekee ja muuttaako se dataa
- Dokumentoi tarvittavat ympäristömuuttujat ja esiehdot skriptin alussa
- Lisää skripti yllä olevaan taulukkoon
- Jos skripti tarvitsee omia testejä, sijoita ne tähän hakemistoon. Importattujen funktioiden (esim. `backend/src/`) testit ovat niiden alkuperäisessä sijainnissa

## Rakenne

Jokaisella skriptillä on oma alihakemisto. Testit sijoitetaan samaan hakemistoon.

```
scripts/
├── skriptiNimi/
│   ├── skriptiNimi.ts
│   └── test/
│       └── skriptiNimi.test.ts
└── tsconfig.json
```

## Käytännöt

- Jokaisella skriptillä on oma alihakemisto: `scripts/<skriptiNimi>/<skriptiNimi>.ts`
- Testit sijoitetaan `test/`-alihakemistoon: `scripts/<skriptiNimi>/test/<skriptiNimi>.test.ts`
- Dokumentoi skriptin alussa mitä se tekee, muuttaako se dataa, tarvittavat ympäristömuuttujat ja käyttöohje
- Jos tarvitset importteja muista hakemistoista (esim. `deployment/`), lisää polku `scripts/tsconfig.json` tiedoston `include`-taulukkoon
