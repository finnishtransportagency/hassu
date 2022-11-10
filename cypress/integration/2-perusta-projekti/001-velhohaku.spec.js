/// <reference types="cypress" />
const projektiNimi = Cypress.env("projektiNimi");
const oid = Cypress.env("oid");

describe("Hae projekti Velhosta", () => {
  before(() => {
    cy.abortEarly();
    cy.login("A1");

    cy.archiveProjekti(oid);
  });

  it("Hae projekti Velhosta", () => {
    cy.visit(Cypress.env("host") + "/yllapito/perusta");
    cy.get('input[name="name"]').should("be.visible").type(projektiNimi);
    cy.get("#hae").click();
    cy.get('a[role="row"]').focus().contains(projektiNimi);
  });
});
