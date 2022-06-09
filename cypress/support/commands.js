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

// The following code copied from https://rajneesh-m49.medium.com/skipping-cypress-tests-on-first-failure-and-saving-resources-2c63e3bb0705 to skip running tests after failure
before(() => {
  if (Cypress.browser.isHeaded) {
    cy.clearCookie("shouldSkip");
  } else {
    cy.getCookie("shouldSkip").then((cookie) => {
      if (cookie && typeof cookie === "object" && cookie.value === "true") {
        Cypress.runner.stop();
      }
    });
  }
});

afterEach(function onAfterEach() {
  if (this.currentTest.state === "failed") {
    cy.setCookie("shouldSkip", "true");
    //set cookie to skip tests for further specs
    Cypress.runner.stop();
    //this will skip tests only for current spec
  }
});

Cypress.Cookies.defaults({
  preserve: "shouldSkip",
});

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
    }
  });
});
