/// <reference types="cypress" />
const oid = Cypress.env("oid");

describe("Perusta projekti", () => {
  before(() => {
    cy.abortEarly();
    Cypress.config("scrollBehavior", "nearest");
    cy.login("A1");

    cy.archiveProjekti(oid);
  });

  it("Perusta projekti", () => {
    cy.visit(Cypress.env("host") + "/yllapito/perusta/" + oid).get("main");
    cy.get('input[name="kayttoOikeudet.0.puhelinnumero"').should("be.enabled").type("0291111111");
    cy.get("#save_and_open_projekti").click();
    cy.url().should("contain", "/yllapito/projekti/");
  });
});
