import { defineConfig } from "cypress";

export default defineConfig({
  experimentalStudio: true,
  chromeWebSecurity: false,
  defaultCommandTimeout: 30000,
  pageLoadTimeout: 300000,
  env: {
    projektiNimi: "VLS-TESTI HASSU AUTOMAATTITESTIPROJEKTI1",
    oid: "1.2.246.578.5.1.2978288874.2711575506",
  },
  video: false,
  numTestsKeptInMemory: 10,
  reporter: "cypress-multi-reporters",
  reporterOptions: {
    configFile: "cypress-reporter-config.json",
  },
  e2e: {
    testIsolation: false,
    experimentalRunAllSpecs: true,
    specPattern: [
      "cypress/e2e/1 - login/1-login.cy.ts",
      "cypress/e2e/2-perusta-projekti/001-velhohaku.cy.ts",
      "cypress/e2e/2-perusta-projekti/002-perusta.cy.ts",
      "cypress/e2e/2-perusta-projekti/003-perustiedot.cy.ts",
      "cypress/e2e/2-perusta-projekti/004-aloituskuulutus.cy.ts",
      "cypress/e2e/2-perusta-projekti/005-aloituskuulutus-julkinen.cy.ts",
      "cypress/e2e/2-perusta-projekti/006-suunnitteluvaihe-perustiedot.cy.ts",
      "cypress/e2e/2-perusta-projekti/007-suunnitteluvaihe-uusi-kierros.cy.ts",
      "cypress/e2e/2-perusta-projekti/008-tiedotettavat-kiinteistonomistajat.cy.ts",
      "cypress/e2e/2-perusta-projekti/009-nahtavillaolovaihe-perustiedot.cy.ts",
      "cypress/e2e/2-perusta-projekti/010-hyvaksyntavaihe.cy.ts",
      "cypress/e2e/2-perusta-projekti/011-imoitustaulusyote.cy.ts",
      "cypress/e2e/2-perusta-projekti/012-jatkopaatos.cy.ts",
      "cypress/e2e/2-perusta-projekti/013-kasittelyn-tila.cy.ts",
      "cypress/e2e/2-perusta-projekti/099-henkilot.cy.ts",
      "cypress/e2e/3-hae-projekteja/1-kansalaisen-haut.cy.ts",
      "cypress/e2e/4-migraatio/1-migraatio.cy.ts",
    ],
    // We've imported your old cypress plugins here.
    // You may want to clean this up later by importing these.
    setupNodeEvents(on, config) {
      return require("./cypress/plugins/index.js")(on, config);
    },
  },
});
