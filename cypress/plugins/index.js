/// <reference types="cypress" />
// ***********************************************************
// This example plugins/index.js can be used to load plugins
//
// You can change the location of this file or turn off loading
// the plugins file with the 'pluginsFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/plugins-guide
// ***********************************************************

// This function is called when a project is opened or re-opened (e.g. due to
// the project's config changing)

let shouldSkip = false;
/**
 * @type {Cypress.PluginConfig}
 */
module.exports = (on) => {
  on("task", {
    resetShouldSkipFlag() {
      shouldSkip = false;
      return null;
    },
    shouldSkip(value) {
      if (value != null) shouldSkip = value;
      return shouldSkip;
    },
  });

  on("before:browser:launch", (browser = {}, config) => {
    if (browser.name === "chrome") {
      // Päivämäärän valinnasta katoaa CI/CD-ajossa kyky kirjoittaa päivämäärä tekstinä. Tällä asetuksella tekstin kirjoittaminen saadaan takaisin.
      // Asetukset arvattu näiden perusteella:
      // https://github.com/mui/mui-x/pull/5684/files#diff-8cbe9d03b9fa5e04ef3fa3f8be9763779e57a2b026d5c70cb2ed7afcef0d6df5R129
      // https://github.com/grafana/xk6-browser/issues/147
      config.args.push("--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4");
    }
    return config;
  });

  require("cypress-mochawesome-reporter/plugin")(on);
};
