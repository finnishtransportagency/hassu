module.exports = {
  locales: ["fi", "sv"],
  defaultLocale: "fi",
  pages: {
    "*": ["common", "projekti"],
  },
  loadLocaleFrom: (lang, ns) =>
    // You can use a dynamic import, fetch, whatever. You should
    // return a Promise with the JSON file.
    import(`./src/locales/${lang}/${ns}.json`).then((m) => m.default),
};
