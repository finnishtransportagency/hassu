#!/usr/bin/env bash
# Kopioitu https://github.com/natancabral/pdfkit-table/pull/57/files PR:stä, koska kyseinen PR ei ainakaan vielä ole mergattu.
# PR korjaa taulukon solujen katkeamisen sivulta toiselle ja siten tyhjähköjen sivujen generoitumisen

SED_OPTS=
if [ "$(uname -s)" == "Darwin" ]
then
  SED_OPTS="-i ''"
else
  SED_OPTS="-i"
fi

sed $SED_OPTS 's/if(options\.useSafelyMarginBottom \&\& this\.y/if(options\.useSafelyMarginBottom \&\& rowBottomY/g' ./node_modules/pdfkit-table/index.js
