#!/usr/bin/env bash
git fetch
touch .env.test
npm run loginNpm
# Asennetaan asianhallinta-paketti, jotta sen registry päivittyy käytössä olevaan AWS-tiliin package-lock.json-tiedoostossa
npm i @hassu/asianhallinta
npm ci
npm run buildimage:generate
