#!/usr/bin/env bash
# Kopioi korjaus bugiin, jonka takia useammat alpha-channelit menevät sekaisin uutta versiota päätellessä.
# Korjaus on PR:ssä https://github.com/semantic-release/semantic-release/pull/2416.
# Koska korjausta ei ole valmiiksi saatavilla, tämä skripti patchaa semantic-releasen.

cp ./deployment/patch/get-last-release.js_patch ./deployment/node_modules/semantic-release/lib/get-last-release.js
