/// <reference types="cypress" />
const projektiNimi = Cypress.env("projektiNimi");
const oid = Cypress.env("oid");
const muuTunnus = "A-tunnus2 Hassu";
const muuEmail = "mikko.haapamaki01@cgi.com";
const muuNumero = "029123456";

describe("Projektin henkilot", () => {
  beforeEach(() => {
    cy.abortEarly();
  });

  // Clean up so new user or municipality representative won't cause problems in later tests and also for re-runnability
  it("Palauta alkutilanne", () => {
    cy.login("A1");
    cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid);
    cy.get("#suunnittelusopimus_yhteyshenkilo").select(1, { force: true });
    cy.get("#save").click();

    cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/henkilot");
    cy.get("input[name $='yleinenYhteystieto']").last().scrollIntoView();
    cy.get("body").then((body) => {
      let htmlElements = body.find("[data-testid='poista.kayttoOikeudet.2']");
      if (htmlElements.get().length > 0) {
        for (const htmlElement of htmlElements) {
          htmlElement.click();
        }
        cy.get("#save_projekti").click();
        cy.contains("Henkilötietojen tallennus onnistui", { timeout: 30000 }).wait(2000);
      }
    }); //TODO button elementtien tavalliset nimi ja id selectorit + .last() ei tunnu toimivan
  });

  it("Tarkista projektin henkilot velhosta", () => {
    cy.login("A1");
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
    cy.login("A1");
    cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/henkilot");
    cy.get("#lisaa_uusi_kayttaja").click();
    // input name ends with kayttajatunnus
    cy.get("input[name $='kayttajatunnus']").last().should("be.enabled").type(muuTunnus).wait(1000);
    cy.get(".MuiAutocomplete-loading").should("not.exist");
    cy.get("input[name $='kayttajatunnus']").last().type("{downArrow}").type("{enter}");

    cy.get("input[name $='puhelinnumero']").last().should("be.enabled").type(muuNumero);
    cy.get("input[name $='yleinenYhteystieto']").last().should("be.enabled").check({ force: true });
    cy.get("#save_projekti").click();
    cy.contains("Henkilötietojen tallennus onnistui", { timeout: 3000 });
  });

  it("Tarkista yhteystiedot julkiselta puolelta", () => {
    cy.login("A1");
    cy.visit(Cypress.env("host") + "/suunnitelma/" + oid);
    cy.contains("A-tunnus1 Hassu");
    cy.get("#yhteystiedot").contains(muuTunnus);
    cy.contains("A-tunnus3 Hassu").should("not.exist"); // varahenkilo
  });

  it("Vaihda muu henkilo kunnan edustajaksi", () => {
    cy.login("A1");
    cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/henkilot");
    cy.get("input[name $='yleinenYhteystieto']").last().uncheck({ force: true });
    cy.get("#save_projekti").click();
    cy.contains("Henkilötietojen tallennus onnistui", { timeout: 3000 });

    cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid);
    cy.get("#suunnittelusopimus_yhteyshenkilo").select(muuTunnus);
    cy.get("#save").click();
    cy.contains("Tallennus onnistui", { timeout: 3000 });

    cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/henkilot");
    cy.get("input[name $='yleinenYhteystieto']").should("have.length", 3);
    cy.get("input[name $='yleinenYhteystieto']").last().should("be.disabled").should("be.checked");
  });

  it("Tarkista uusi kunnan edustaja julkisella puolella", () => {
    cy.login("A1");
    cy.visit(Cypress.env("host") + "/suunnitelma/" + oid);
    cy.contains("A-tunnus1 Hassu");
    cy.get("#kuntatiedot").contains(muuTunnus);
  });
});
