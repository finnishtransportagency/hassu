/// <reference types="cypress" />

const projektiNimi = Cypress.env("projektiNimi");
const oid = Cypress.env("oid");

describe("Kansalaisen haut", () => {
  before(() => {
    cy.abortEarly();
  });

  it("Tarkista desktop hakulomakkeen osat", { scrollBehavior: "center" }, function () {
    cy.viewport("macbook-13");
    cy.visit(Cypress.env("host"));
    cy.get('[name="vapaasanahaku"]').should("be.visible");
    cy.get('[name="kunta"]').should("be.visible");
    cy.get('[name="maakunta"]').should("not.exist");
    cy.get('[name="vaylamuoto"]').should("not.exist");

    cy.contains("Lisää hakuehtoja");
    cy.get("#lisaa_hakuehtoja_button").click();
    cy.contains("Vähemmän hakuehtoja");
    cy.get('[name="maakunta"]').should("be.visible");
    cy.get('[name="vaylamuoto"]').should("be.visible");
    cy.get("#hae").should("be.visible");
  });

  it("Tarkista mobiilin hakulomakkeen osat", { scrollBehavior: "center" }, function () {
    cy.viewport("iphone-x");
    cy.visit(Cypress.env("host"));

    cy.get('[name="vapaasanahaku"]').should("be.visible");
    cy.get('[name="kunta"]').should("be.visible");
    cy.get("#lisaa_hakuehtoja_button").should("not.exist");
    cy.get('[name="maakunta"]').should("be.visible");
    cy.get('[name="vaylamuoto"]').should("be.visible");
    cy.get("#nollaa_hakuehdot_button").should("be.visible");
    cy.get("#hae").should("be.visible");

    cy.get("#pienenna_hakulomake_button").click();
    cy.get('[name="vapaasanahaku"]').should("not.exist");
    cy.get('[name="kunta"]').should("not.exist");
    cy.get("#lisaa_hakuehtoja_button").should("not.exist");
    cy.get('[name="maakunta"]').should("not.exist");
    cy.get('[name="vaylamuoto"]').should("not.exist");
    cy.get("#nollaa_hakuehdot_button").should("be.visible");
    cy.get("#hae").should("not.exist");
  });

  it.skip("Hae projektin nimellä", { scrollBehavior: "center" }, function () {});
  it.skip("Hae projektin kunnalla", { scrollBehavior: "center" }, function () {});
  it.skip("Hae projektin maakunnalla", { scrollBehavior: "center" }, function () {});
  it.skip("Hae projektin väylämuodolla", { scrollBehavior: "center" }, function () {});
  it.skip("Tee yhdistelmähaku", { scrollBehavior: "center" }, function () {});
  it.skip("Nollaa hakuehdot", { scrollBehavior: "center" }, function () {});
});
