/// <reference types="cypress" />
const oid = Cypress.env("oid");

describe("Perusta projekti", () => {
  before(() => {
    Cypress.config("scrollBehavior", "nearest");
    cy.login("A1");
    cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/arkistoi");
  });

  it("Perusta projekti", () => {
    cy.visit(Cypress.env("host") + "/yllapito/perusta/" + oid).get("main");
    cy.get('input[name="kayttoOikeudet.0.puhelinnumero"').should("be.enabled").type("0291111111");
    cy.get("#save_and_open_projekti").click();
  });
});
