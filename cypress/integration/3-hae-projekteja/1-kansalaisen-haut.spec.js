/// <reference types="cypress" />

const projektiNimi = Cypress.env("projektiNimi");
const oid = Cypress.env("oid");

function selectFromDropdown(elementId, valueText) {
  cy.get(elementId).click();
  cy.get("li")
    .contains(new RegExp("^" + valueText + "$"))
    .click();
}

describe("Kansalaisen haut", () => {
  before(() => {
    cy.abortEarly();
  });

  it("Tarkista desktop hakulomakkeen osat", { scrollBehavior: "center" }, function () {
    cy.visit(Cypress.env("host"));
    cy.viewport("macbook-13");
    cy.get('[name="vapaasanahaku"]').should("be.visible");
    cy.get("#kunta").should("be.visible");
    cy.get("#maakunta").should("not.exist");
    cy.get("#vaylamuoto").should("not.exist");

    cy.contains("Lisää hakuehtoja");
    cy.get("#lisaa_hakuehtoja_button").click();
    cy.contains("Vähemmän hakuehtoja");
    cy.get("#maakunta").should("be.visible");
    cy.get("#vaylamuoto").should("be.visible");
    cy.get("#hae").should("be.visible");
  });

  it("Tarkista mobiilin hakulomakkeen osat", { scrollBehavior: "center" }, function () {
    cy.visit(Cypress.env("host"));
    cy.viewport("iphone-x");

    cy.get('[name="vapaasanahaku"]').should("be.visible");
    cy.get("#kunta").should("be.visible");
    cy.get("#lisaa_hakuehtoja_button").should("not.exist");
    cy.get("#maakunta").should("be.visible");
    cy.get("#vaylamuoto").should("be.visible");
    cy.get("#nollaa_hakuehdot_button").should("be.visible");
    cy.get("#hae").should("be.visible");

    cy.get("#pienenna_hakulomake_button").click();
    cy.get('[name="vapaasanahaku"]').should("not.exist");
    cy.get("#kunta").should("not.exist");
    cy.get("#lisaa_hakuehtoja_button").should("not.exist");
    cy.get("#maakunta").should("not.exist");
    cy.get("#vaylamuoto").should("not.exist");
    cy.get("#nollaa_hakuehdot_button").should("be.visible");
    cy.get("#hae").should("not.exist");
  });

  it("Hae projektin nimellä", { scrollBehavior: "center" }, function () {
    cy.visit(Cypress.env("host"));
    cy.viewport("macbook-13");

    cy.get('[name="vapaasanahaku"]').type("hassu");
    cy.get("#hae").click();
    cy.get("#hakutuloslista").should("have.length.least", 1);
  });

  it("Hae projektin kunnalla", { scrollBehavior: "center" }, function () {
    cy.visit(Cypress.env("host"));
    cy.viewport("macbook-13");

    selectFromDropdown("#kunta", "Helsinki");
    cy.get("#hae").click();
    cy.get("#hakutuloslista").should("have.length.least", 1);
  });

  it("Hae projektin maakunnalla", { scrollBehavior: "center" }, function () {
    cy.visit(Cypress.env("host"));
    cy.viewport("macbook-13");

    cy.get("#lisaa_hakuehtoja_button").click();
    selectFromDropdown("#maakunta", "Uusimaa");
    cy.get("#hae").click();
    cy.get("#hakutuloslista").should("have.length.least", 1);
  });

  it("Hae projektin väylämuodolla", { scrollBehavior: "center" }, function () {
    cy.visit(Cypress.env("host"));
    cy.viewport("macbook-13");

    cy.get("#lisaa_hakuehtoja_button").click();
    selectFromDropdown("#vaylamuoto", "Tie");
    cy.get("#hae").click();
    cy.get("#hakutuloslista").should("have.length.least", 1);
  });

  it("Tee yhdistelmähaku", { scrollBehavior: "center" }, function () {
    cy.visit(Cypress.env("host"));
    cy.viewport("macbook-13");

    cy.get("#lisaa_hakuehtoja_button").click();
    cy.get('[name="vapaasanahaku"]').type("hassu");
    selectFromDropdown("#kunta", "Helsinki");
    selectFromDropdown("#maakunta", "Uusimaa");
    selectFromDropdown("#vaylamuoto", "Tie");
    cy.get("#hae").click();
    cy.get("#hakutuloslista").should("have.length.least", 1);
  });

  it("Nollaa hakuehdot", { scrollBehavior: "center" }, function () {
    cy.visit(Cypress.env("host"));
    cy.viewport("macbook-13");

    cy.get("#lisaa_hakuehtoja_button").click();
    cy.get('[name="vapaasanahaku"]').type("hassu");
    selectFromDropdown("#kunta", "Helsinki");
    selectFromDropdown("#maakunta", "Uusimaa");
    selectFromDropdown("#vaylamuoto", "Tie");
    cy.get("#hae").click();

    cy.get("#nollaa_hakuehdot_button").click();
    cy.get("#lisaa_hakuehtoja_button").click();
    cy.get('[name="vapaasanahaku"]').should("not.have.text", "hassu");
    cy.get("#kunta").should("not.have.text", "Helsinki");
    cy.get("#maakunta").should("not.have.text", "Uusimaa");
    cy.get("#vaylamuoto").should("not.have.text", "Tie");
  });

  it("Tarkista desktop sivutus", { scrollBehavior: "center" }, function () {
    cy.visit(Cypress.env("host"));
    cy.viewport("macbook-13");

    cy.get("#hakutulosmaara").then(($hakutulosmaara) => {
      const maaraTxt = $hakutulosmaara.text().match("\\d+")?.pop();
      const lukumaara = +maaraTxt;
      if (lukumaara > 10) {
        cy.get("#sivunumerolista").should("be.visible");
        cy.get("#navigointinapit_desktop").should("be.visible");
      } else {
        cy.get("#sivunumerolista").should("not.exist");
        cy.get("#navigointinapit_desktop").should("not.exist");
      }
    });
  });

  it("Tarkista mobiili sivutus", { scrollBehavior: "center" }, function () {
    cy.visit(Cypress.env("host"));
    cy.viewport("iphone-x");

    cy.get("#hakutulosmaara").then(($hakutulosmaara) => {
      const maaraTxt = $hakutulosmaara.text().match("\\d+")?.pop();
      const lukumaara = +maaraTxt;
      if (lukumaara > 10) {
        cy.get("#sivunumerolista").should("not.exist");
        cy.get("#navigointinapit_mobiili").should("be.visible");
      } else {
        cy.get("#navigointinapit_mobiili").should("not.exist");
      }
    });
  });
});
