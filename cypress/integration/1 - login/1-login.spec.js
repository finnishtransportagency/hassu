/// <reference types="cypress" />

describe("Login", () => {
  it("Ohjaa kirjoutumaton kirjautumissivulle", () => {
    cy.intercept("/yllapito/graphql", (req) => req.reply({ statusCode: 302 })).as("graphql");
    cy.intercept("/yllapito/kirjaudu", (req) => req.reply({ statusCode: 400, body: "login page" })).as("kirjaudu");
    cy.visit(Cypress.env("host") + "/yllapito");
    cy.wait("@graphql");
    cy.wait("@kirjaudu");
    cy.contains("login page");
  });

  it("Kirjaudu A1 käyttäjänä", () => {
    cy.login("A1");
    cy.visit(Cypress.env("host") + "/yllapito");
  });
});
