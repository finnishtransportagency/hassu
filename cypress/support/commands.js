// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
import "cypress-file-upload";

/**
 * Faster typing into input fields
 */
Cypress.Commands.overwrite("type", (originalFn, subject, text, options = {}) => {
  options.delay = 3;

  return originalFn(subject, text, options);
});

Cypress.config("scrollBehavior", "nearest");

function abortEarly() {
  if (this.currentTest.state === "failed") {
    return cy.task("shouldSkip", true);
  }
  cy.task("shouldSkip").then((value) => {
    if (value) this.skip();
  });
}

function setAbortEarlyStatus() {
  if (this.currentTest.state === "failed") {
    return cy.task("shouldSkip", true);
  }
}

beforeEach(abortEarly);
afterEach(setAbortEarlyStatus);

before(() => {
  if (Cypress.browser.isHeaded) {
    // Reset the shouldSkip flag at the start of a run, so that it
    //  doesn't carry over into subsequent runs.
    // Do this only for headed runs because in headless runs,
    //  the `before` hook is executed for each spec file.
    cy.task("resetShouldSkipFlag");
  }
});

Cypress.Commands.add("abortEarly", abortEarly);

Cypress.Commands.add("login", (testuser) => {
  cy.session(testuser, () => {
    const username = Cypress.env(testuser + "-username");
    const password = Cypress.env(testuser + "-password");
    const roles = Cypress.env(testuser + "-roles");

    if (Cypress.env("localServer") === true) {
      cy.setCookie("x-hassudev-uid", username);
      cy.setCookie("x-hassudev-roles", roles);
      cy.visit(Cypress.env("host") + "/yllapito");
    } else if (Cypress.env("localServer") === false) {
      // Visit our site to make it as origin
      cy.visit(Cypress.env("host"));
      // Make a server-side request to login page
      cy.request("GET", Cypress.env("host") + "/yllapito/kirjaudu").then((loginPageResponse) => {
        const url = String(loginPageResponse.body).match('action="(.*?)"')[1];
        cy.request({
          method: "POST",
          form: true,
          url,
          body: { username, password },
        }).then((res) => {
          cy.document().then((document) => {
            document.documentElement.innerHTML = res.body;
            cy.get("FORM").submit();
          });
        });
      });
      cy.url({ timeout: 4000 }).should("not.contain", "sso");
    }
  });
});

Cypress.Commands.add("archiveProjekti", (oid) => {
  cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/arkistoi");
  cy.get("#result").should("contain", "Arkistoinnin tulos");
  cy.wait(2000); // Give some time for search index to update
});
