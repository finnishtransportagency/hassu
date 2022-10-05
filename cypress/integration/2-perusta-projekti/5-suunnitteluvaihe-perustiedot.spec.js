/// <reference types="cypress" />

import { ProjektiTestCommand } from '../../../common/testUtil.dev';

const projektiNimi = Cypress.env("projektiNimi");
const oid = Cypress.env("oid");

describe("Projektin suunnitteluvaihe (perustiedot)", () => {
  before(() => {
    cy.abortEarly();
  });

  it("Tallenna suunnitteluvaiheen perustiedot", { scrollBehavior: "center" }, function() {
    cy.login("A1");
    // Remove most of the data from suunnitteluvaihe to enable re-tunning this test as many times as needed
    cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/suunnittelu", { timeout: 30000 });
    cy.contains(projektiNimi);

    cy.visit(Cypress.env("host") + ProjektiTestCommand.oid(oid).resetSuunnitteluVaihe(), { timeout: 30000 });
    cy.contains(projektiNimi);
    cy.wait(2000);

    cy.get("main").then((main) => {
      let saveDraftButton = main.find("#save_suunnitteluvaihe_perustiedot_draft");
      if (saveDraftButton.length === 0) {
        expect.fail("Suunnitteluvaihe not editable");
      }
    });

    const selectorToTextMap = new Map([
      ['[name="suunnitteluVaihe.hankkeenKuvaus.SUOMI"]', "hankkeen kuvaus Suomeksi"],
      ['[name="suunnitteluVaihe.hankkeenKuvaus.RUOTSI"]', "hankkeen kuvaus Ruotsiksi"],
      ['[name="suunnitteluVaihe.suunnittelunEteneminenJaKesto"]', "kuvaus edistyksestä"],
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
    cy.login("A1");
    const selectorToTextMap = new Map([
      ['[name="suunnitteluVaihe.hankkeenKuvaus.SUOMI"]', "Päivitetty hankkeen kuvaus Suomeksi"],
      ['[name="suunnitteluVaihe.hankkeenKuvaus.RUOTSI"]', "Päivitetty hankkeen kuvaus Ruotsiksi"],
      ['[name="suunnitteluVaihe.suunnittelunEteneminenJaKesto"]', "Päivitetty kuvaus edistyksestä"],
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
      .filter((text) => text !== "Päivitetty hankkeen kuvaus Ruotsiksi")
      .forEach((text) => {
        cy.contains(text);
      });

    cy.visit(Cypress.env("host") + "/sv/suunnitelma/" + oid + "/suunnittelu");
    [...selectorToTextMap.values()]
      .filter((text) => text !== "Päivitetty hankkeen kuvaus Suomeksi")
      .forEach((text) => {
        cy.contains(text);
      });
  });
});
