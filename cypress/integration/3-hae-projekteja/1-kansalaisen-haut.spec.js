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

  it("Hae projektin nimellä", { scrollBehavior: "center" }, function () {
    cy.viewport("macbook-13");
    cy.visit(Cypress.env("host"));

    cy.get('[name="vapaasanahaku"]').type("hassu");
    cy.get("#hae").click();
    cy.get("#hakutuloslista").should("have.length.least", 1);
  });

  it("Hae projektin kunnalla", { scrollBehavior: "center" }, function () {
    cy.viewport("macbook-13");
    cy.visit(Cypress.env("host"));

    cy.get('[name="kunta"]').select("Helsinki");
    cy.get("#hae").click();
    cy.get("#hakutuloslista").should("have.length.least", 1);
  });

  it("Hae projektin maakunnalla", { scrollBehavior: "center" }, function () {
    cy.viewport("macbook-13");
    cy.visit(Cypress.env("host"));

    cy.get("#lisaa_hakuehtoja_button").click();
    cy.get('[name="maakunta"]').select("Uusimaa");
    cy.get("#hae").click();
    cy.get("#hakutuloslista").should("have.length.least", 1);
  });

  it("Hae projektin väylämuodolla", { scrollBehavior: "center" }, function () {
    cy.viewport("macbook-13");
    cy.visit(Cypress.env("host"));

    cy.get("#lisaa_hakuehtoja_button").click();
    cy.get('[name="vaylamuoto"]').select("Tie");
    cy.get("#hae").click();
    cy.get("#hakutuloslista").should("have.length.least", 1);
  });

  it("Tee yhdistelmähaku", { scrollBehavior: "center" }, function () {
    cy.viewport("macbook-13");
    cy.visit(Cypress.env("host"));

    cy.get("#lisaa_hakuehtoja_button").click();
    cy.get('[name="vapaasanahaku"]').type("hassu");
    cy.get('[name="kunta"]').select("Helsinki");
    cy.get('[name="maakunta"]').select("Uusimaa");
    cy.get('[name="vaylamuoto"]').select("Tie");
    cy.get("#hae").click();
    cy.get("#hakutuloslista").should("have.length.least", 1);
  });

  it("Nollaa hakuehdot", { scrollBehavior: "center" }, function () {
    cy.viewport("macbook-13");
    cy.visit(Cypress.env("host"));

    cy.get("#lisaa_hakuehtoja_button").click();
    cy.get('[name="vapaasanahaku"]').type("hassu");
    cy.get('[name="kunta"]').select("Helsinki");
    cy.get('[name="maakunta"]').select("Uusimaa");
    cy.get('[name="vaylamuoto"]').select("Tie");
    cy.get("#hae").click();

    cy.get("#nollaa_hakuehdot_button").click();
    cy.get("#lisaa_hakuehtoja_button").click();
    cy.get('[name="vapaasanahaku"]').should("not.have.text", "hassu");
    cy.get('[name="kunta"]').should("not.have.text", "Helsinki");
    cy.get('[name="maakunta"]').should("not.have.text", "Uusimaa");
    cy.get('[name="vaylamuoto"]').should("not.have.text", "Tie");
  });

  it("Tarkista desktop sivutus", { scrollBehavior: "center" }, function () {
    cy.viewport("macbook-13");
    cy.visit(Cypress.env("host"));

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
    cy.viewport("iphone-x");
    cy.visit(Cypress.env("host"));

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
