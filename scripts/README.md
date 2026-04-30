<!-- Contains code generated or recommended by Amazon Q -->

# scripts/

Apuskriptejä debuggaukseen, selvityksiin, ylläpitoon ja muihin ad-hoc-tehtäviin.

## Saatavilla olevat skriptit

| Skripti                     | Kuvaus                                                                                 | Käyttö                                                                                                             |
| --------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `recreateMuistutusEmail.ts` | Luo ja tulostaa muistutussähköpostit (kirjaamo + valinnaisesti kuittaus kansalaiselle) | `npx ts-node --project scripts/tsconfig.json scripts/recreateMuistutusEmail.ts <oid> <muistuttajaId> [--kuittaus]` |
| `resendSuomiFiMessages`     | Suomi.fi-sanomien uudelleenlähetys                                                     | `npx ts-node scripts/resendSuomiFiMessages/resendSuomiFiMessages.ts --env dev/prod [--dry-run]`                    |

## Uuden skriptin lisääminen

1. Luo uusi skripti tähän hakemistoon
2. TypeScript-skripteille käytä `scripts/tsconfig.json`: `npx ts-node --project scripts/tsconfig.json scripts/<skripti>.ts`
3. Jos tarvitset importteja muista hakemistoista (esim. `deployment/`), lisää polku `scripts/tsconfig.json` tiedoston `include`-taulukkoon

### Käytännöt

- Dokumentoi skriptin alussa mitä skripti tekee ja muuttaako se dataa
- Dokumentoi tarvittavat ympäristömuuttujat ja esiehdot skriptin alussa
- Lisää skripti yllä olevaan taulukkoon
- Jos skripti tarvitsee omia testejä, sijoita ne tähän hakemistoon. Importattujen funktioiden (esim. `backend/src/`) testit ovat niiden alkuperäisessä sijainnissa
