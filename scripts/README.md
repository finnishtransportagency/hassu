<!-- Contains code generated or recommended by Amazon Q -->

# scripts/

Apuskriptejä debuggaukseen, selvityksiin, ylläpitoon ja muihin ad-hoc-tehtäviin. Skriptit ovat read-only ellei toisin mainita.

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
