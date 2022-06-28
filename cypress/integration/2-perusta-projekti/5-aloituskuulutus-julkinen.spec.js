/// <reference types="cypress" />
const oid = Cypress.env("oid");

describe("Projektin aloituskuulutus kansalaisille", () => {
  before(() => {
    cy.abortEarly();
  });
  it("Aloituskuulutus näkyy kansalaisille", () => {
    cy.visit(Cypress.env("host") + "/suunnitelma/" + oid + "/aloituskuulutus");
    cy.contains("Hankkeen kuvaus Suomeksi");
  });
});
