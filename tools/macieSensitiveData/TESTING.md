<!-- Contains code generated or recommended by Amazon Q -->

# Macie Sensitive Data Scanning – Testausohje

Tämä ohje kuvaa, miten Macie-arkaluontoisen datan skannausta ja sähköposti-ilmoituksia testataan dev-ympäristössä.

Macie skannaa `hassu-dev-yllapito`-bucketin `palautteet/` ja `muistutukset/` -polut kuukausittain (ensimmäinen maanantai klo 3:00).
Skannaus käynnistetään EventBridge-aikataululla, joka kutsuu Lambda-funktiota (`MacieClassificationJobLambda`).

**Mitä skannataan:**
- Bucket: `hassu-dev-yllapito`
- Prefixit: `palautteet/` ja `muistutukset/`
- Tunnisteet: AWS built-in (Personal, Financial, Credentials) + custom identifier suomalaisille henkilötunnuksille (DDMMYY+/-A###X)
- Löydökset julkaistaan SNS:ään 15 min välein

## 1. EventBridge-säännön testaus (nopein)

Testaa, että Macie Finding → EventBridge → SNS → sähköposti -ketju toimii ilman oikeaa skannausta.

```bash
aws events put-events --entries '[{
  "Source": "aws.macie",
  "DetailType": "Macie Finding",
  "Detail": "{\"severity\":{\"score\":8,\"description\":\"HIGH\"},\"type\":\"SensitiveData:S3Object/CustomIdentifier\",\"category\":\"CLASSIFICATION\",\"description\":\"Test finding: Finnish personal ID detected\",\"resourcesAffected\":{\"s3Bucket\":{\"name\":\"hassu-dev-yllapito\"},\"s3Object\":{\"key\":\"palautteet/test.txt\"}}}"
}]'
```

Odotettu tulos: sähköposti-ilmoitus saapuu SecurityAlertEmail-osoitteeseen sisältäen bucket, object, finding type ja severity.

## 2. End-to-end-testaus testidatalla

Lataa tiedosto, joka sisältää tunnistettavaa PII-dataa, ja käynnistä skannaus.

```bash
# Luo testitiedosto, jossa on tunnistettavaa PII-dataa
cat <<'EOF' | aws s3 cp - s3://hassu-dev-yllapito/palautteet/macie-test.txt
Nimi: Matti Meikäläinen
Henkilötunnus: 010180-123A
Sähköposti: matti.meikalainen@example.com
Puhelinnumero: +358 40 1234567
IBAN: FI21 1234 5600 0007 85
EOF
```

**Huom:** Henkilötunnus korjattu oikeaan muotoon (010180-123A käyttää validia tarkistusmerkkiä).

Ajoitettu skannaus tapahtuu vasta seuraavana maanantaina klo 3:00. Voit käynnistää skannauksen välittömästi:

**Vaihtoehto A: Lambda-konsolista (helpoin)**
1. AWS Console → Lambda → MacieClassificationJobLambda
2. Test-välilehti → Create test event (tyhjä JSON `{}`)
3. Test → katso jobin ID responsesta

**Vaihtoehto B: AWS CLI**
```bash
aws lambda invoke --function-name MacieClassificationJobLambda-<stack-hash> response.json
cat response.json
```

**Vaihtoehto C: Macie API suoraan (bypass Lambda)**

```bash
aws macie2 create-classification-job \
  --job-type ONE_TIME \
  --name "hassu-dev-pii-scan-test" \
  --s3-job-definition '{
    "bucketDefinitions": [{
      "accountId": "<account-id>",
      "buckets": ["hassu-dev-yllapito"]
    }],
    "scoping": {
      "includes": {
        "and": [{
          "simpleScopeTerm": {
            "comparator": "STARTS_WITH",
            "key": "OBJECT_KEY",
            "values": ["palautteet/", "muistutukset/"]
          }
        }]
      }
    }
  }'
```

Skannaus kestää tyypillisesti muutamasta minuutista kymmeniin minuutteihin. Löydökset näkyvät:

- Sähköpostissa (EventBridge → SNS)
- Macie-konsolissa: **Findings**
- Security Hubissa (jos käytössä)

## 3. Skannauksen tilan seuranta

```bash
# Listaa skannausjobit
aws macie2 list-classification-jobs --filter-criteria '{
  "includes": [{
    "comparator": "STARTS_WITH",
    "key": "name",
    "values": ["hassu-sensitive-data-scan"]
  }]
}'

# Tarkista yksittäisen jobin tila
aws macie2 describe-classification-job --job-id <job-id>

# Listaa löydökset
aws macie2 list-findings
aws macie2 get-findings --finding-ids <finding-id>
```

## Siivoaminen

```bash
aws s3 rm s3://hassu-dev-yllapito/palautteet/macie-test.txt
```
