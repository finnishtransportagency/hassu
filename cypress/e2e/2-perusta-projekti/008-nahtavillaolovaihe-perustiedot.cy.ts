import { CLEAR_ALL, formatDate, typeIntoFields, verifyAllDownloadLinks } from "../../support/util";
import { ProjektiTestCommand } from "../../../common/testUtil.dev";
import {
  avaaAineistonMuokkaus,
  hyvaksyNahtavillaoloKuulutus,
  lisaaNahtavillaoloAineistot,
  suljeAineistonMuokkaus,
  taytaNahtavillaoloPerustiedot,
} from "../../support/nahtavillaolo";
import { lahetaMuistutus } from "../../support/palauteTaiMuistutus";
import dayjs = require("dayjs");

describe("8 - Projektin nahtavillaolovaiheen perustiedot", () => {
  const oid = Cypress.env("oid");
  const projektiNimi = Cypress.env("projektiNimi");
  const aineistojenNimet: string[] = ["1400-72L-6708_Yleiskartta_kmv209-216.pdf", "1400-72L-6708-8_Käyttöoikeuskartta.pdf"];

  before(() => {
    cy.abortEarly();
  });

  it("Lisää ainestoja", { scrollBehavior: "center" }, () => {
    cy.login("A1");
    cy.visit(Cypress.env("host") + ProjektiTestCommand.oid(oid).resetNahtavillaolo(), { timeout: 30000 });
    cy.contains("OK");

    lisaaNahtavillaoloAineistot({
      oid,
      aineistoNahtavilla: { toimeksianto: "Toimeksianto1" },
    });

    cy.get("#aineisto_tab").click({ force: true });
    // Test saved aineistot
    cy.get("input[type='hidden'][name ^='aineistoNahtavilla.osa_a.']").should("exist");
    cy.get("input[type='hidden'][name ^='lisaAineisto.']").should("exist");
  });

  it("Tallenna nahtavillaolon kuulutustiedot", { scrollBehavior: "center" }, function () {
    cy.login("A1");
    cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/nahtavillaolo", { timeout: 30000 });
    cy.contains(projektiNimi);

    const weekAfterToday = formatDate(dayjs().add(1, "week"));
    const selectorToTextMap = {
      '[name="nahtavillaoloVaihe.kuulutusPaiva"]': weekAfterToday,
      '[name="nahtavillaoloVaihe.hankkeenKuvaus.SUOMI"]': "nahtavillaolovaiheen kuvaus Suomeksi",
      '[name="nahtavillaoloVaihe.hankkeenKuvaus.RUOTSI"]': "nahtavillaolovaiheen kuvaus Ruotsiksi",
      '[name="nahtavillaoloVaihe.ilmoituksenVastaanottajat.kunnat.0.sahkoposti"]': "test@vayla.fi",
      '[name="nahtavillaoloVaihe.ilmoituksenVastaanottajat.kunnat.1.sahkoposti"]': "test@vayla.fi",
    };

    taytaNahtavillaoloPerustiedot(oid, selectorToTextMap);

    // Not yet public
    cy.visit(Cypress.env("host") + "/suunnitelma/" + oid + "/nahtavillaolo");

    Object.values(selectorToTextMap).forEach((text) => {
      cy.contains(text).should("not.exist");
    });

    cy.visit(Cypress.env("host") + "/sv/suunnitelma/" + oid + "/nahtavillaolo");
    Object.values(selectorToTextMap).forEach((text) => {
      cy.contains(text).should("not.exist");
    });
  });

  it("Muokkaa ja julkaise nahtavillaolon kuulutus", { scrollBehavior: "center" }, () => {
    // This test can not be run multiple times without first archiving projekti
    // or manually deleting nahtavillaoloVaiheJulkaisut from DB
    cy.login("A3"); // Tee muokkaus ja hyvaksyminen projektin varahenkilona - varahenkilolla tulisi olla projektiin samat oikeudet kuin projektipaallikolla

    cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/nahtavillaolo", { timeout: 30000 });
    cy.contains(projektiNimi);

    cy.get("#kuulutuksentiedot_tab").click({ force: true });

    const selectorToTextMap = {
      '[name="nahtavillaoloVaihe.hankkeenKuvaus.SUOMI"]': "Päivitetty hankkeen kuvaus Suomeksi",
      '[name="nahtavillaoloVaihe.hankkeenKuvaus.RUOTSI"]': "Päivitetty hankkeen kuvaus Ruotsiksi",
    };

    cy.wait(1000);

    typeIntoFields(selectorToTextMap);
    hyvaksyNahtavillaoloKuulutus({ kuulutusPaivaInFuture: true });
  });

  it("Avaa aineistomuokkaus", { scrollBehavior: "center" }, function () {
    avaaAineistonMuokkaus(oid);
    // Testaa sulkemista ja uudelleenavaamista
    suljeAineistonMuokkaus(oid);
    avaaAineistonMuokkaus(oid);
  });

  it("Tee aineistomuokkausta ja lähetä hyväksyttäväksi", { scrollBehavior: "center" }, function () {
    lisaaNahtavillaoloAineistot({
      oid,
      aineistoNahtavilla: {
        toimeksianto: "Suunnitelma-aineisto",
        aineistojenNimet,
      },
    });

    cy.get("#aineistomuokkaus_send_for_approval").click();
    cy.contains("Aineistot lähetetty hyväksyttäväksi").wait(2000); // extra wait added because somehow the next test brings blank  page otherwise
  });

  it("Hyväksy aineistomuokkaus", { scrollBehavior: "center" }, function () {
    cy.login("A1");
    cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/nahtavillaolo/aineisto", { timeout: 30000 });

    cy.get("#button_open_acceptance_dialog").click();
    cy.get("#accept_kuulutus").click();

    cy.get("#lisa_aineisto_accordion_lukutila").click();
    aineistojenNimet.forEach((nimi) => {
      cy.get("#lisa_aineisto_accordion_lukutila").contains(nimi);
    });
  });

  it("Siirrä menneisyyteen", { scrollBehavior: "center" }, function () {
    cy.login("A1");
    cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/nahtavillaolo/aineisto", { timeout: 30000 });

    cy.get("#ajansiirto_paiva_lkm").type(CLEAR_ALL + "7");
    cy.get("#ajansiirto_siirra").click();
    cy.wait(10000);
  });

  it("Tarkista lisaaineiston lataussivu", { scrollBehavior: "center" }, () => {
    cy.login("A1");

    cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/nahtavillaolo/aineisto", { timeout: 30000 });
    cy.contains(projektiNimi);
    cy.get("#aineisto_tab").click({ force: true });

    cy.get("a[href*='lausuntopyyntoaineistot']").should("have.attr", "target");
    cy.get("a[href*='lausuntopyyntoaineistot']").then((link) => link.removeAttr("target"));
    cy.get("a[href*='lausuntopyyntoaineistot']").click();
    cy.contains("Lausuntopyyntöön liitetty lisäaineisto");
    verifyAllDownloadLinks({ absoluteURLs: true });
    cy.get("#lisaAineisto").click();
    aineistojenNimet.forEach((nimi) => {
      cy.get("#lisaAineisto").contains(nimi);
    });
  });

  it("Nähtävilläolon kansalaisnäkymä sekä muistutuksen jättäminen", { scrollBehavior: "center" }, () => {
    cy.visit(Cypress.env("host") + "/suunnitelma/" + oid + "/nahtavillaolo");
    cy.contains("Päivitetty hankkeen kuvaus Suomeksi");
    cy.get("#toggle_open_close_kategoriat").click();
    aineistojenNimet.forEach((nimi) => {
      cy.get("#osa_b").contains(nimi);
    });
    lahetaMuistutus();
    cy.contains("Olemme vastaanottaneet muistutuksesi onnistuneesti ja se välitetään");

    cy.visit(Cypress.env("host") + "/sv/suunnitelma/" + oid + "/nahtavillaolo");
    cy.contains("Päivitetty hankkeen kuvaus Ruotsiksi");
  });
});
