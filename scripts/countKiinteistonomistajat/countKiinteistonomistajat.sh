#!/bin/bash
# Contains code generated or recommended by Amazon Q

# Usage: ./countKiinteistonomistajat.sh <start-time> <end-time> [env]
# Times in ISO 8601 format, e.g. 2024-01-01T00:00:00
#
# Prerequisites:
#   npm run switchenv  # select the target account (dev/prod)

START=${1:?"Anna alkuaika (esim. 2024-01-01T00:00:00)"}
END=${2:?"Anna loppuaika (esim. 2024-12-31T23:59:59)"}
ENV=${3:-prod}
LOG_GROUP="/aws/lambda/hassu-kiinteisto-${ENV}"

START_MS=$(date -d "$START" +%s%3N)
END_MS=$(date -d "$END" +%s%3N)

fetch_sum() {
  local pattern="$1"
  aws logs filter-log-events \
    --log-group-name "$LOG_GROUP" \
    --start-time "$START_MS" \
    --end-time "$END_MS" \
    --filter-pattern "\"$pattern\"" \
    --query 'events[].message' \
    --output json \
    | jq '[.[] | fromjson | .msg | capture("(?<n>[0-9]+)") | .n | tonumber] | add // 0'
}

LISATTY=$(fetch_sum "Lisätään")
POISTETTU=$(fetch_sum "Otetaan käytöstä")
EROTUS=$((LISATTY - POISTETTU))

echo "Lisätty:    $LISATTY"
echo "Poistettu:  $POISTETTU"
echo "Erotus:     $EROTUS"
