<!-- Contains code generated or recommended by Amazon Q -->

# Macie Sensitive Data Scanning – Testausohje

Tämä ohje kuvaa, miten Macie-arkaluontoisen datan skannausta ja sähköposti-ilmoituksia testataan dev-ympäristössä.

Macie skannaa `hassu-dev-yllapito`-bucketin `palautteet/` ja `muistutukset/` -polut viikoittain maanantaisin.

## 1. EventBridge-säännön testaus (nopein)

Testaa, että Macie Finding → EventBridge → SNS → sähköposti -ketju toimii ilman oikeaa skannausta.

```bash
aws events put-events --entries '[{
  "Source": "aws.macie",
  "DetailType": "Macie Finding",
  "Detail": "{\"severity\":{\"score\":8,\"description\":\"HIGH\"},\"type\":\"SensitiveData:S3Object/Personal\",\"description\":\"Test finding: PII detected in S3 object\",\"resourcesAffected\":{\"s3Bucket\":{\"name\":\"hassu-dev-yllapito\"},\"s3Object\":{\"key\":\"palautteet/test.txt\"}}}"
}]'
```

Odotettu tulos: sähköposti-ilmoitus saapuu SecurityAlertEmail-osoitteeseen.

## 2. End-to-end-testaus testidatalla

Lataa tiedosto, joka sisältää tunnistettavaa PII-dataa, ja käynnistä skannaus.

```bash
# Luo testitiedosto, jossa on tunnistettavaa PII-dataa
cat <<'EOF' | aws s3 cp - s3://hassu-dev-yllapito/palautteet/macie-test.txt
Nimi: Matti Meikäläinen
Henkilötunnus: 010180-1234
Sähköposti: matti.meikalainen@example.com
Puhelinnumero: +358 40 1234567
IBAN: FI21 1234 5600 0007 85
EOF
```

Ajoitettu skannaus tapahtuu vasta maanantaina. Voit käynnistää kertaluontoisen skannauksen heti:

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
            "values": ["palautteet/macie-test"]
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
    "values": ["hassu-dev"]
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
