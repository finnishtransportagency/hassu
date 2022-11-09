module.exports = {
  locales: ["fi", "sv"],
  defaultLocale: "fi",
  pages: {
    "*": ["common", "projekti", "footer"],
    "/": ["etusivu"],
    "rgx:^/suunnitelma/": ["projekti-side-bar"],
    "/yllapito/perusta": ["velho-haku"],
    "/suunnitelma/[oid]/nahtavillaolo": ["aineisto"],
    "/suunnitelma/[oid]/lausuntopyyntoaineistot": ["aineisto"],
    "/yllapito/projekti/[oid]/nahtavillaolo/aineisto": ["aineisto"],
    "/yllapito/projekti/[oid]/hyvaksymispaatos/aineisto": ["aineisto"],
    "/yllapito/projekti/[oid]/jatkaminen1/aineisto": ["aineisto"],
    "/suunnitelma/[oid]/hyvaksymismenettelyssa": ["hyvaksymismenettelyssa"],
    "/suunnitelma/[oid]/suunnittelu": ["suunnittelu"],
  },
  loadLocaleFrom: (lang, ns) =>
    // You can use a dynamic import, fetch, whatever. You should
    // return a Promise with the JSON file.
    import(`./src/locales/${lang}/${ns}.json`).then((m) => m.default),
};
