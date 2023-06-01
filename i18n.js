module.exports = {
  locales: ["fi", "sv"],
  defaultLocale: "fi",
  pages: {
    "*": ["common", "projekti", "footer", "error", "header", "breadcrumbs", "tietoa-palvelusta/palautetta-palvelusta-dialog"],
    "/": ["etusivu"],
    "rgx:^/suunnitelma/": ["projekti-side-bar"],
    "rgx:^/tietoa-palvelusta": ["tietoa-palvelusta/navigation"],
    "/tietoa-palvelusta": ["tietoa-palvelusta/tietoa-palvelusta"],
    "/tietoa-palvelusta/tietoa-suunnittelusta": ["tietoa-palvelusta/tietoa-suunnittelusta"],
    "/tietoa-palvelusta/yhteystiedot-ja-palaute": ["tietoa-palvelusta/yhteystiedot-ja-palaute"],
    "/tietoa-palvelusta/saavutettavuus": ["tietoa-palvelusta/saavutettavuus"],
    "/suunnitelma/[oid]/nahtavillaolo": ["aineisto"],
    "/suunnitelma/[oid]/lausuntopyyntoaineistot": ["aineisto"],
    "/suunnitelma/[oid]/hyvaksymispaatos": ["aineisto", "paatos"],
    "/suunnitelma/[oid]/jatkopaatos1": ["aineisto", "paatos"],
    "/suunnitelma/[oid]/jatkopaatos2": ["aineisto", "paatos"],
    "/yllapito/projekti/[oid]/nahtavillaolo/aineisto": ["aineisto"],
    "/yllapito/projekti/[oid]/hyvaksymispaatos/aineisto": ["aineisto"],
    "/yllapito/projekti/[oid]/jatkaminen1/aineisto": ["aineisto"],
    "/yllapito/projekti/[oid]/jatkaminen2/aineisto": ["aineisto"],
    "/suunnitelma/[oid]/hyvaksymismenettelyssa": ["hyvaksymismenettelyssa"],
    "/suunnitelma/[oid]/suunnittelu": ["suunnittelu"],
    "/yllapito/projekti/[oid]/suunnittelu": ["suunnittelu"],
    "/yllapito/projekti/[oid]/suunnittelu/vuorovaikuttaminen": ["suunnittelu"],
  },
  ignoreRoutes: ["/api/"],
  loadLocaleFrom: (lang, ns) =>
    // You can use a dynamic import, fetch, whatever. You should
    // return a Promise with the JSON file.
    import(`./src/locales/${lang}/${ns}.json`).then((m) => m.default),
};
