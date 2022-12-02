/// <reference types="cypress" />

/*
1.2.246.578.5.1.2983738467.1825323454	SUUNNITTELU
1.2.246.578.5.1.2574551391.2902330452	NAHTAVILLAOLO
1.2.246.578.5.1.2789861876.697619507	HYVAKSYMISMENETTELYSSA
1.2.246.578.5.1.2572523015.2790590568	EPÄAKTIIVINEN
 */

import { ProjektiTestCommand } from "../../../common/testUtil.dev";
import { typeIntoFields } from "../../support/util";
import {
  hyvaksyNahtavillaoloKuulutus,
  lisaaNahtavillaoloAineistot,
  taytaNahtavillaoloPerustiedot,
} from "../../support/nahtavillaolo";
import { lisaaPaatosJaAineistot, tallennaKasittelynTilaJaSiirraMenneisyyteen } from "../../support/hyvaksyntavaihe";
import { formatDate } from "../../../src/util/dateUtils";
import dayjs from "dayjs";

function syotaPuhelinnumerot(oid) {
  cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid);
  cy.contains("Projektin Henkilöt", { timeout: 30000 });
  cy.get('input[name="kayttoOikeudet.0.puhelinnumero"]').should("be.enabled").type("0291111111");
  cy.get('input[name="kayttoOikeudet.1.puhelinnumero"]').should("be.enabled").type("0291111111");

  const fieldName = 'input[name="kayttoOikeudet.2.puhelinnumero"]';
  cy.get("body").then((body) => {
    if (body.find(fieldName).length > 0) {
      cy.get(fieldName).should("be.enabled").type("0291111111");
    }
  });
  cy.get("#save_projekti").click();
  cy.contains("Henkilötietojen tallennus onnistui", { timeout: 30000 }).wait(2000);
}

describe("Migraatio", () => {
  before(() => {
    Cypress.config("scrollBehavior", "nearest");
    Cypress.config("keystrokeDelay", 0);
  });

  it("Migraatio suunnitteluvaiheeseen", () => {
    const oid = "1.2.246.578.5.1.2983738467.1825323454";
    cy.login("A1");
    cy.archiveProjekti(oid);
    cy.visit(Cypress.env("host") + ProjektiTestCommand.oid(oid).migroi("SUUNNITTELU"), { timeout: 30000 });
    cy.wait(2000);
    syotaPuhelinnumerot(oid);
    //
    cy.get("#sidenavi_aloituskuulutus").click({ force: true });
    cy.contains("Tämä projekti on tuotu toisesta järjestelmästä, joten kaikki toiminnot eivät ole mahdollisia.");
    cy.get("#sidenavi_suunnitteluvaihe").click({ force: true });
    cy.get("h1").should("contain", "Suunnittelu");

    typeIntoFields(
      new Map([
        ['[name="suunnitteluVaihe.hankkeenKuvaus.SUOMI"]', "hankkeen kuvaus Suomeksi"],
        ['[name="suunnitteluVaihe.suunnittelunEteneminenJaKesto"]', "kuvaus edistyksestä"],
        ['[name="suunnitteluVaihe.arvioSeuraavanVaiheenAlkamisesta"]', "Alkuvuodesta 2023"],
      ])
    );

    cy.get("#save_and_publish").click();
    cy.get("#accept_publish").click();
    cy.contains("Tallennus ja julkaisu onnistui");
  });

  it("Migraatio suunnitteluvaiheeseen kansalaisnäkymä", () => {
    const oid = "1.2.246.578.5.1.2983738467.1825323454";
    cy.visit(Cypress.env("host") + "/suunnitelma/" + oid);

    cy.contains("Navigoi vaiheita").scrollIntoView({ offset: { top: -100, left: 0 } });
    cy.get("p").contains("Navigoi vaiheita").click();

    cy.get("#sidenavi_0").should("exist").click({ force: true });
    cy.contains("Suunnitelma on tuotu toisesta järjestelmästä, joten tiedoissa voi olla puutteita.");

    cy.get("#sidenavi_1").should("exist");
    cy.get("#sidenavi_2").should("not.exist");
  });

  it("Migraatio nähtävilläolovaiheeseen", () => {
    const oid = "1.2.246.578.5.1.2574551391.2902330452";
    cy.login("A1");
    cy.archiveProjekti(oid);
    cy.visit(Cypress.env("host") + ProjektiTestCommand.oid(oid).migroi("NAHTAVILLAOLO"), { timeout: 30000 });
    cy.wait(2000);
    syotaPuhelinnumerot(oid);

    cy.get("#sidenavi_aloituskuulutus").click({ force: true });
    cy.contains("Tämä projekti on tuotu toisesta järjestelmästä, joten kaikki toiminnot eivät ole mahdollisia.");
    cy.get("#sidenavi_suunnitteluvaihe").click({ force: true });
    cy.get("h1").should("contain", "Suunnittelu");
    cy.contains("Tämä projekti on tuotu toisesta järjestelmästä, joten kaikki toiminnot eivät ole mahdollisia.");

    // Täytä nähtävilläolovaihe
    cy.get("#sidenavi_nahtavillaolovaihe").click({ force: true });

    const selectorToTextMap = new Map([
      ['[name="nahtavillaoloVaihe.hankkeenKuvaus.SUOMI"]', "nahtavillaolovaiheen kuvaus Suomeksi"],
      ['[name="nahtavillaoloVaihe.ilmoituksenVastaanottajat.kunnat.0.sahkoposti"]', "test@vayla.fi"],
      ['[name="nahtavillaoloVaihe.ilmoituksenVastaanottajat.kunnat.1.sahkoposti"]', "test@vayla.fi"],
    ]);
    taytaNahtavillaoloPerustiedot(oid, selectorToTextMap);
    lisaaNahtavillaoloAineistot(oid);
    cy.get("#kuulutuksentiedot_tab").click({ force: true });
    hyvaksyNahtavillaoloKuulutus();
  });

  it("Migraatio nähtävilläolovaiheeseen kansalaisnäkymä", () => {
    const oid = "1.2.246.578.5.1.2574551391.2902330452";
    cy.visit(Cypress.env("host") + "/suunnitelma/" + oid);

    cy.contains("Navigoi vaiheita").scrollIntoView({ offset: { top: -100, left: 0 } });
    cy.get("p").contains("Navigoi vaiheita").click();

    cy.get("#sidenavi_0").should("exist").click({ force: true });
    cy.contains("Suunnitelma on tuotu toisesta järjestelmästä, joten tiedoissa voi olla puutteita.");
    cy.get("#sidenavi_1").should("exist").click({ force: true });
    cy.contains("Suunnitelma on tuotu toisesta järjestelmästä, joten tiedoissa voi olla puutteita.");
    cy.get("#sidenavi_2").should("exist").click({ force: true });
    cy.contains("Kuulutus suunnitelman nähtäville asettamisesta");
  });

  it("Migraatio hyväksymismenettelyssä-vaiheeseen", () => {
    const oid = "1.2.246.578.5.1.2789861876.697619507";
    cy.login("A1");
    cy.archiveProjekti(oid);
    cy.visit(Cypress.env("host") + ProjektiTestCommand.oid(oid).migroi("HYVAKSYMISMENETTELYSSA"), { timeout: 30000 });
    cy.wait(2000);
    syotaPuhelinnumerot(oid);

    cy.get("#sidenavi_aloituskuulutus").click({ force: true });
    cy.contains("Tämä projekti on tuotu toisesta järjestelmästä, joten kaikki toiminnot eivät ole mahdollisia.");

    cy.get("#sidenavi_suunnitteluvaihe").click({ force: true });
    cy.get("h1").should("contain", "Suunnittelu");
    cy.contains("Tämä projekti on tuotu toisesta järjestelmästä, joten kaikki toiminnot eivät ole mahdollisia.");

    cy.get("#sidenavi_nahtavillaolovaihe").click({ force: true });
    cy.get("h1").should("contain", "Nähtävilläolovaihe");
    cy.contains("Tämä projekti on tuotu toisesta järjestelmästä, joten kaikki toiminnot eivät ole mahdollisia.");

    cy.get("#sidenavi_hyvaksyminen").click({ force: true });
    cy.contains("Kuulutus hyväksymispäätöksestä");

    tallennaKasittelynTilaJaSiirraMenneisyyteen(oid, undefined, "asianumero123");

    lisaaPaatosJaAineistot(oid);

    // This test can not be run multiple times without first archiving projekti
    // or manually deleting hyvaksymisPaatosVaiheJulkaisut from DB
    cy.login("A1");

    cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/hyvaksymispaatos", { timeout: 30000 });

    cy.get("#kuulutuksentiedot_tab").click({ force: true });

    const today = formatDate(dayjs());
    cy.get('[name="paatos.kuulutusPaiva"]').should("be.enabled").type(today, {
      waitForAnimations: true,
    });

    cy.get('[name="paatos.hallintoOikeus"]').select("HELSINKI");
    cy.get('[name="paatos.ilmoituksenVastaanottajat.kunnat.0.sahkoposti"]').clear().type("test@vayla.fi");
    cy.get('[name="paatos.ilmoituksenVastaanottajat.kunnat.1.sahkoposti"]').clear().type("test@vayla.fi");

    cy.get("#save_and_send_for_acceptance").click({ force: true });
    cy.contains("Lähetys onnistui", { timeout: 30000 });
    cy.get("#kuulutuksentiedot_tab").click({ force: true });
    cy.get("#button_open_acceptance_dialog")
      .should("be.enabled")
      .scrollIntoView({ offset: { top: 500, left: 0 } })
      .should("be.visible")
      .click({ force: true });
    cy.get("#accept_kuulutus").click();
    cy.contains("Hyväksyminen onnistui", { timeout: 30000 });

    cy.reload();
    cy.get("#kuulutuksentiedot_tab").click({ force: true });

    cy.contains("Kuulutus nähtäville asettamisesta on julkaistu");
  });

  it("Migraatio hyväksymismenettelyssä-vaiheeseen kansalaisnäkymä", () => {
    const oid = "1.2.246.578.5.1.2789861876.697619507";
    cy.visit(Cypress.env("host") + "/suunnitelma/" + oid, { timeout: 30000 });

    cy.contains("Kuulutus suunnitelman hyväksymisestä");

    cy.contains("Navigoi vaiheita").scrollIntoView({ offset: { top: -100, left: 0 } });
    cy.get("p").contains("Navigoi vaiheita").click();

    cy.get("#sidenavi_0").should("exist").click({ force: true });
    cy.contains("span", "Suunnittelun käynnistäminen");
    cy.contains("Suunnitelma on tuotu toisesta järjestelmästä, joten tiedoissa voi olla puutteita.");
    cy.get("#sidenavi_1").should("exist").click({ force: true });
    cy.contains("span", "Suunnittelussa");
    cy.contains("Tämä projekti on tuotu toisesta järjestelmästä, joten kaikki toiminnot eivät ole mahdollisia.");
    cy.get("#sidenavi_2").should("exist").click({ force: true });
    cy.contains("span", "Kuulutus suunnitelman nähtäville asettamisesta");
    cy.contains("Tämä projekti on tuotu toisesta järjestelmästä, joten kaikki toiminnot eivät ole mahdollisia.");
    cy.get("#sidenavi_3").should("exist").click({ force: true });
    cy.contains("span", "Hyväksymismenettelyssä");
    cy.contains("Suunnitelma on siirtynyt viimeistelyyn ja hyväksymiseen");
  });

  it("Migraatio epäaktiivinen-vaiheeseen", () => {
    const oid = "1.2.246.578.5.1.2572523015.2790590568";
    cy.login("A1");
    cy.archiveProjekti(oid);
    cy.visit(Cypress.env("host") + ProjektiTestCommand.oid(oid).migroi("EPAAKTIIVINEN_1", "2022-10-01", "asianro123"), {
      timeout: 30000,
    });
    cy.wait(2000);
    syotaPuhelinnumerot(oid);

    cy.get("#sidenavi_aloituskuulutus").click({ force: true });
    cy.contains("Tämä projekti on tuotu toisesta järjestelmästä, joten kaikki toiminnot eivät ole mahdollisia.");

    cy.get("#sidenavi_suunnitteluvaihe").click({ force: true });
    cy.get("h1").should("contain", "Suunnittelu");
    cy.contains("Tämä projekti on tuotu toisesta järjestelmästä, joten kaikki toiminnot eivät ole mahdollisia.");

    cy.get("#sidenavi_nahtavillaolovaihe").click({ force: true });
    cy.get("h1").should("contain", "Nähtävilläolovaihe");
    cy.contains("Tämä projekti on tuotu toisesta järjestelmästä, joten kaikki toiminnot eivät ole mahdollisia.");

    cy.get("#sidenavi_hyvaksyminen").click({ force: true });
    cy.contains("Tämä projekti on tuotu toisesta järjestelmästä, joten kaikki toiminnot eivät ole mahdollisia.");

    cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/kasittelyntila", {
      timeout: 30000,
      retryOnNetworkFailure: true,
      retryOnStatusCodeFailure: true,
    });

    cy.get('[name="kasittelynTila.ensimmainenJatkopaatos.paatoksenPvm"]').should("be.enabled").clear().type("01.10.2022", {
      waitForAnimations: true,
    });
    cy.get('[name="kasittelynTila.ensimmainenJatkopaatos.asianumero"]').clear().type("asianumero123");
    cy.get("#lisaa_jatkopaatos").click();
    cy.get("#accept_and_save_jatkopaatos").click();
    cy.contains("Jatkopäätös lisätty!").wait(2000);
    cy.get("#sidenavi_1_jatkopaatos").should("exist");
  });
});
