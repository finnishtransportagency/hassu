<!-- Contains code generated or recommended by Amazon Q -->

# Suomi.fi-viestien uudelleenlähetys

Skripti lähettää epäonnistuneet Suomi.fi-sanomat uudelleen SQS-jonoon. Viestit luetaan JSON-tiedostosta, joka on parsittu CloudWatch-logeista.

## Tiedostot

| Tiedosto                       | Kuvaus                                                            |
| ------------------------------ | ----------------------------------------------------------------- |
| `resendSuomiFiMessages.ts`     | Pääskripti, joka lukee viestit ja lähettää ne SQS-jonoon          |
| `parseSuomifiSanomaData.ts`    | Parsii CloudWatch-lokimuotoisen JSON:n `FailedMessage`-taulukoksi |
| `failed-suomifi-messages.json` | Epäonnistuneet viestit (CloudWatch Logs Insights -muodossa)       |

## Edellytykset

- Aktiivinen AWS-kirjautuminen kohdympäristön tilille (`AWS_PROFILE`)
- `failed-suomifi-messages.json` täytetty oikealla datalla

## Käyttö

### Dry-run (ei lähetä viestejä)

```bash
npx ts-node scripts/resendSuomiFiMessages/resendSuomiFiMessages.ts --env dev --dry-run
```

### Oikea lähetys

```bash
npx ts-node scripts/resendSuomiFiMessages/resendSuomiFiMessages.ts --env dev
```

**Huom:** Kun ajetaan tuotantoympäristöön (`--env prod`), vaihda ensin ympäristö ja kirjaudu prod-tilille:

```bash
npm run switchenv  # valitse prod
npm run login # Kirjaudu prod-tilin AWS-tilille
npx ts-node scripts/resendSuomiFiMessages/resendSuomiFiMessages.ts --env prod
```

### Parametrit

| Parametri         | Pakollinen | Kuvaus                                                            |
| ----------------- | ---------- | ----------------------------------------------------------------- |
| `--env dev\|prod` | Kyllä      | Kohdeympäristö. Määrittää SQS-jonon nimen (`suomifi-queue-<env>`) |
| `--dry-run`       | Ei         | Tulostaa lähetettävät viestit ilman oikeaa SQS-lähetystä          |

## Syötetiedoston muoto

`failed-suomifi-messages.json` sisältää CloudWatch Logs -muotoisia lokientriejä:

```json
[
  {
    "@timestamp": "2026-01-01 00:00:00.000",
    "msg": "Suomi.fi sanoma",
    "@message": {
      "level": "info",
      "time": "2026-01-01T00:00:00.000Z",
      "correlationId": "1-00000000-000000000000000000000000",
      "tag": "BACKEND",
      "sanoma": {
        "omistajaId": "00000000-0000-0000-0000-000000000001",
        "tyyppi": "PUBLISH_NAHTAVILLAOLO",
        "oid": "1.2.246.578.5.1.0000000000.0000000000",
        "muistuttajaIdsForLahetystilaUpdate": [],
        "omistajaIdsForLahetystilaUpdate": []
      },
      "msg": "Suomi.fi sanoma"
    }
  }
]
```

Tiedoston saa generoitua CloudWatch Logs Insights -kyselyllä, joka hakee epäonnistuneet sanomat, ja viemällä tulokset JSON-muodossa.

## Toimintaperiaate

1. Lukee `failed-suomifi-messages.json`-tiedoston ja parsii siitä `SuomiFiSanoma`-viestit
2. Lähettää viestit erissä (max 10 kpl/erä) kohdeympäristön SQS-jonoon
3. Kirjaa jokaisen onnistuneen ja epäonnistuneen lähetyksen audit-lokiin
