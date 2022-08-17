module.exports = {
  locales: ["fi", "sv"],
  defaultLocale: "fi",
  pages: {
    "*": ["common", "projekti"],
    "/yllapito/perusta": ["velho-haku"],
    "/suunnitelma/[oid]/nahtavillaolo": ["aineisto"],
    "/suunnitelma/[oid]/lausuntopyyntoaineistot": ["aineisto"],
    "/yllapito/projekti/[oid]/nahtavillaolo": ["aineisto"],
    "/suunnitelma/[oid]/hyvaksymismenettelyssa": ["hyvaksymismenettelyssa"],
  },
  loadLocaleFrom: (lang, ns) =>
    // You can use a dynamic import, fetch, whatever. You should
    // return a Promise with the JSON file.
    import(`./src/locales/${lang}/${ns}.json`).then((m) => m.default),
};
