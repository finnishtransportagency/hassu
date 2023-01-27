/// <reference types="cypress" />
import { typeIntoFields } from "../../support/util";
import { ProjektiTestCommand } from "../../../common/testUtil.dev";
import { hyvaksyNahtavillaoloKuulutus, lisaaNahtavillaoloAineistot, taytaNahtavillaoloPerustiedot } from "../../support/nahtavillaolo";
import { lahetaMuistutus } from "../../support/palauteTaiMuistutus";

const oid = Cypress.env("oid");
const projektiNimi = Cypress.env("projektiNimi");

describe("8 - Projektin nahtavillaolovaiheen perustiedot", () => {
  before(() => {
    cy.abortEarly();
  });

  it("Lisaa ainestoja", { scrollBehavior: "center" }, () => {
    cy.login("A1");
    cy.visit(Cypress.env("host") + ProjektiTestCommand.oid(oid).resetNahtavillaolo(), { timeout: 30000 });

    lisaaNahtavillaoloAineistot(oid);

    cy.get("#aineisto_tab").click({ force: true });
    // Test saved aineistot
    cy.get("input[type='hidden'][name ^='aineistoNahtavilla.osa_a.']").should("exist");
    cy.get("input[type='hidden'][name ^='lisaAineisto.']").should("exist");
  });

  it("Tallenna nahtavillaolon kuulutustiedot", { scrollBehavior: "center" }, function () {
    cy.login("A1");
    cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/nahtavillaolo", { timeout: 30000 });
    cy.contains(projektiNimi);

    const selectorToTextMap = new Map([
      ['[name="nahtavillaoloVaihe.hankkeenKuvaus.SUOMI"]', "nahtavillaolovaiheen kuvaus Suomeksi"],
      ['[name="nahtavillaoloVaihe.hankkeenKuvaus.RUOTSI"]', "nahtavillaolovaiheen kuvaus Ruotsiksi"],
      ['[name="nahtavillaoloVaihe.ilmoituksenVastaanottajat.kunnat.0.sahkoposti"]', "test@vayla.fi"],
      ['[name="nahtavillaoloVaihe.ilmoituksenVastaanottajat.kunnat.1.sahkoposti"]', "test@vayla.fi"],
    ]);
    taytaNahtavillaoloPerustiedot(oid, selectorToTextMap);

    // Not yet public
    cy.visit(Cypress.env("host") + "/suunnitelma/" + oid + "/nahtavillaolo");

    [...selectorToTextMap.values()].forEach((text) => {
      cy.contains(text).should("not.exist");
    });

    cy.visit(Cypress.env("host") + "/sv/suunnitelma/" + oid + "/nahtavillaolo");
    [...selectorToTextMap.values()].forEach((text) => {
      cy.contains(text).should("not.exist");
    });
  });

  it("Muokkaa ja julkaise nahtavillaolon kuulutus", { scrollBehavior: "center" }, () => {
    // This test can not be run multiple times without first archiving projekti
    // or manually deleting nahtavillaoloVaiheJulkaisut from DB
    cy.login("A1");

    cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/nahtavillaolo", { timeout: 30000 });
    cy.contains(projektiNimi);

    cy.get("#kuulutuksentiedot_tab").click({ force: true });

    const selectorToTextMap = new Map([
      ['[name="nahtavillaoloVaihe.hankkeenKuvaus.SUOMI"]', "Päivitetty hankkeen kuvaus Suomeksi"],
      ['[name="nahtavillaoloVaihe.hankkeenKuvaus.RUOTSI"]', "Päivitetty hankkeen kuvaus Ruotsiksi"],
    ]);

    cy.wait(1000);

    typeIntoFields(selectorToTextMap);
    hyvaksyNahtavillaoloKuulutus();
  });

  it("Tarkista lisaaineiston lataussivu", { scrollBehavior: "center" }, () => {
    cy.login("A1");

    cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/nahtavillaolo", { timeout: 30000 });
    cy.contains(projektiNimi);
    cy.get("#aineisto_tab").click({ force: true });

    cy.get("a[href*='lausuntopyyntoaineistot']").click();
    cy.contains("Lausuntopyyntöön liitetty lisäaineisto");
  });

  it("Nähtävilläolon kansalaisnäkymä sekä muistutuksen jättäminen", { scrollBehavior: "center" }, () => {
    cy.visit(Cypress.env("host") + "/suunnitelma/" + oid + "/nahtavillaolo");
    cy.contains("Päivitetty hankkeen kuvaus Suomeksi");
    lahetaMuistutus();
    cy.contains("Olemme vastaanottaneet muistutuksesi onnistuneesti ja se välitetään");

    cy.visit(Cypress.env("host") + "/sv/suunnitelma/" + oid + "/nahtavillaolo");
    cy.contains("Päivitetty hankkeen kuvaus Ruotsiksi");
  });
});
