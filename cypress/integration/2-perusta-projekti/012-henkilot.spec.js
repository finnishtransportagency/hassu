/// <reference types="cypress" />
const projektiNimi = Cypress.env("projektiNimi");
const oid = Cypress.env("oid");

describe("Projektin henkilot", () => {
  before(() => {
    cy.abortEarly();
    cy.login("A1");
  });

  it("Tarkista projektin henkilot velhosta", () => {
    //projektipaallikko
    cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/henkilot");
    cy.contains("Projektin Henkilöt");
    cy.contains(projektiNimi);
    cy.get('input[name="kayttoOikeudet.0.sahkoposti"').should("be.disabled").should("have.value", "mikko.haapamki@cgi.com");
    cy.get('input[name="kayttoOikeudet.0.yleinenYhteystieto"').should("be.disabled").should("be.checked");

    //varahenkilo
    cy.get('input[name="kayttoOikeudet.1.sahkoposti"').should("be.disabled").should("have.value", "mikko.haapamaki02@cgi.com");
    cy.get('input[name="kayttoOikeudet.1.varahenkiloValinta"').should("be.disabled").should("be.checked");
  });

  it("Lisaa muu henkilo", () => {
    cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/henkilot");
    cy.get("#lisaa_uusi_kayttaja").click();
    // input name ends with kayttajatunnus
    cy.get("input[name $='kayttajatunnus']")
      .last()
      .should("be.enabled")
      .type("A-tunnus2 Hassu")
      .wait(1000)
      .type("{downArrow}")
      .type("{enter}");

    cy.get("input[name $='puhelinnumero']").last().should("be.enabled").type("029123456");
    cy.get("input[name $='yleinenYhteystieto']").last().should("be.enabled").check({ force: true });
    cy.get("#save_projekti").click();
    cy.contains("Henkilötietojen tallennus onnistui", { timeout: 3000 });
  });

  it.skip("Tarkista ja lisaa muu henkilo suunnittelusopimuksen valintalistalta", () => {});

  it.skip("Tarkista yhteystiedot julkiselta puolelta", () => {});
});
