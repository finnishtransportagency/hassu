/// <reference types="cypress" />

describe("Login", () => {
  it("Kirjaudu A1 käyttäjänä", () => {
    cy.login("A1");
    cy.visit(Cypress.env("host") + "/yllapito");
  });
});
