#!/bin/bash

while getopts t:u:r:m:d: flag; do
  case "${flag}" in
  t) TOKEN=${OPTARG} ;;
  u) USERID=${OPTARG} ;;
  r) RESULT=${OPTARG} ;;
  m) MESSAGE=${OPTARG} ;;
  d) DESCRIPTION=${OPTARG} ;;
  *)
  esac
done

if [ "$RESULT" -eq "1" ]; then
  TEXT="$MESSAGE succeeced"
else
  TEXT="$MESSAGE FAILED @all"
fi

if [ -n "$DESCRIPTION" ]; then
  TEXT="$TEXT\n$DESCRIPTION"
fi

curl -s -H "X-Auth-Token: $TOKEN" \
  -H "X-User-Id: $USERID" \
  -H "Content-type:application/json" \
  https://rocketchat.vaylapilvi.fi/api/v1/chat.postMessage \
  -d "{ \"channel\": \"#Hassu_build_notifications\", \"text\": \"$TEXT\" }"
