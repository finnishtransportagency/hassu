/// <reference types="cypress" />

const projektiNimi = Cypress.env("projektiNimi");
const oid = Cypress.env("oid");

describe("Projektin suunnitteluvaihe (perustiedot)", () => {
  before(() => {
    cy.abortEarly();
  });

  beforeEach(() => {
    cy.login("A1");
  });

  it("Tallenna suunnitteluvaiheen perustiedot", { scrollBehavior: "center" }, function () {
    cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/suunnittelu");
    cy.contains(projektiNimi);
    cy.wait(2000);

    cy.get("main").then((main) => {
      let saveDraftButton = main.find("#save_suunnitteluvaihe_perustiedot_draft");
      if (saveDraftButton.length === 0) {
        this.skip();
      }
    });

    const selectorToTextMap = new Map([
      ['[name="suunnitteluVaihe.hankkeenKuvaus.SUOMI"]', "hankkeen kuvaus Suomeksi"],
      ['[name="suunnitteluVaihe.hankkeenKuvaus.RUOTSI"]', "hankkeen kuvaus Ruotsiksi"],
      ['[name="suunnitteluVaihe.suunnittelunEteneminenJaKesto"]', "kuvaus edistyksest√§"],
      ['[name="suunnitteluVaihe.arvioSeuraavanVaiheenAlkamisesta"]', "Alkuvuodesta 2023"],
    ]);

    cy.wait(1000);

    selectorToTextMap.forEach((text, selector) => {
      cy.get(selector, {
        timeout: 10000,
      })
        .should("be.enabled")
        .clear()
        .type(text);
    });

    cy.get("#save_suunnitteluvaihe_perustiedot_draft").click();
    cy.contains("Tallennus onnistui").wait(2000); // extra wait added because somehow the next test brings blank aloituskuulutus page otherwise

    cy.reload();

    selectorToTextMap.forEach((text, selector) => {
      cy.get(selector, {
        timeout: 10000,
      }).should("have.value", text);
    });

    cy.visit(Cypress.env("host") + "/suunnitelma/" + oid + "/suunnittelu");

    [...selectorToTextMap.values()].forEach((text) => {
      cy.contains(text).should("not.exist");
    });

    cy.visit(Cypress.env("host") + "/sv/suunnitelma/" + oid + "/suunnittelu");
    [...selectorToTextMap.values()].forEach((text) => {
      cy.contains(text).should("not.exist");
    });
  });

  it("Muokkaa ja julkaise suunnitteluvaiheen perustiedot", { scrollBehavior: "center" }, () => {
    const selectorToTextMap = new Map([
      ['[name="suunnitteluVaihe.hankkeenKuvaus.SUOMI"]', "P√§ivitetty hankkeen kuvaus Suomeksi"],
      ['[name="suunnitteluVaihe.hankkeenKuvaus.RUOTSI"]', "P√§ivitetty hankkeen kuvaus Ruotsiksi"],
      ['[name="suunnitteluVaihe.suunnittelunEteneminenJaKesto"]', "P√§ivitetty kuvaus edistyksest√§"],
      ['[name="suunnitteluVaihe.arvioSeuraavanVaiheenAlkamisesta"]', "Alkuvuodesta 2024"],
    ]);
    cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/suunnittelu");
    cy.contains(projektiNimi);

    cy.wait(1000);

    selectorToTextMap.forEach((text, selector) => {
      cy.get(selector, {
        timeout: 10000,
      })
        .should("be.enabled")
        .clear()
        .type(text);
    });

    cy.get("#save_and_publish").click();
    cy.get("#accept_publish").click();
    cy.contains("Tallennus ja julkaisu onnistui").wait(2000); // extra wait added because somehow the next test brings blank aloituskuulutus page otherwise

    cy.reload();

    selectorToTextMap.forEach((text, selector) => {
      cy.get(selector, {
        timeout: 10000,
      }).should("have.value", text);
    });

    cy.visit(Cypress.env("host") + "/suunnitelma/" + oid + "/suunnittelu");

    [...selectorToTextMap.values()]
      .filter((text) => text !== "P√§ivitetty hankkeen kuvaus Ruotsiksi")
      .forEach((text) => {
        cy.contains(text);
      });

    cy.visit(Cypress.env("host") + "/sv/suunnitelma/" + oid + "/suunnittelu");
    [...selectorToTextMap.values()]
      .filter((text) => text !== "P√§ivitetty hankkeen kuvaus Suomeksi")
      .forEach((text) => {
        cy.contains(text);
      });
  });
});
