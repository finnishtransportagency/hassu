/// <reference types="cypress" />
import dayjs from "dayjs";
import { formatDate } from "../../../src/util/dateUtils";
import { ProjektiTestCommand } from "../../../common/testUtil.dev";
import { lisaaPaatosJaAineistot, tallennaKasittelynTilaJaSiirraMenneisyyteen } from "../../support/hyvaksyntavaihe";

const projektiNimi = Cypress.env("projektiNimi");
const oid = Cypress.env("oid");
const asianumero = "VÄYLÄ/1234/01.02.03/2022";

describe("9 - Projektin hyvaksymispaatosavaiheen kuulutustiedot", () => {
  before(() => {
    cy.abortEarly();
  });

  it("Siirra nähtävilläolovaihe menneisyyteen", { scrollBehavior: "center" }, function () {
    // Move nähtävilläolo to past
    cy.visit(Cypress.env("host") + ProjektiTestCommand.oid(oid).nahtavillaoloMenneisyyteen(), { timeout: 30000 });
  });

  it("Tallenna kasittelyn tila ja siirra menneisyyteen", { scrollBehavior: "center" }, () => {
    cy.login("A1");

    cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/kasittelyntila", {
      timeout: 30000,
      retryOnNetworkFailure: true,
      retryOnStatusCodeFailure: true,
    });
    cy.visit(Cypress.env("host") + ProjektiTestCommand.oid(oid).resetHyvaksymisvaihe(), { timeout: 30000 });
    cy.reload(); // extra reload to avoid white page

    tallennaKasittelynTilaJaSiirraMenneisyyteen(oid, projektiNimi, asianumero);

    cy.wait(1000);
    cy.visit(Cypress.env("host") + "/suunnitelma/" + oid + "/hyvaksymismenettelyssa");
    cy.contains("Suunnitelma on siirtynyt viimeistelyyn ja hyväksymiseen");
  });

  it("Lisaa paatos ja aineistot", { scrollBehavior: "center" }, () => {
    lisaaPaatosJaAineistot(oid, projektiNimi);
  });

  it("Muokkaa ja julkaise hyvaksymispaatoksen kuulutus", { scrollBehavior: "center" }, () => {
    // This test can not be run multiple times without first archiving projekti
    // or manually deleting hyvaksymisPaatosVaiheJulkaisut from DB
    cy.login("A1");

    cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/hyvaksymispaatos", { timeout: 30000 });
    cy.contains(projektiNimi);

    cy.get("#kuulutuksentiedot_tab")
      .scrollIntoView({ offset: { top: -250, left: 0 } })
      .click();

    const today = formatDate(dayjs());
    cy.get('[name="paatos.kuulutusPaiva"]').should("be.enabled").type(today, {
      waitForAnimations: true,
    });

    cy.get('[name="paatos.hallintoOikeus"]').select("HELSINKI");
    cy.get('[name="paatos.kuulutusYhteystiedot.yhteysHenkilot"]')
      .first()
      .should("be.disabled")
      .should("be.checked")
      .siblings()
      .invoke("text")
      .should("eq", "A-tunnus1 Hassu, A000112, (Alajärvi), 0291111111, mikko.haapamki@cgi.com");
    cy.get('[name="paatos.kuulutusYhteystiedot.yhteysHenkilot"]').last().should("not.be.disabled").should("not.be.checked");
    cy.get('[name="paatos.ilmoituksenVastaanottajat.kunnat.0.sahkoposti"]').clear().type("test@vayla.fi");
    cy.get('[name="paatos.ilmoituksenVastaanottajat.kunnat.1.sahkoposti"]').clear().type("test@vayla.fi");

    cy.get("#save_and_send_for_acceptance", { timeout: 120000 }).should("be.enabled");
    cy.get("#save_and_send_for_acceptance")
      .scrollIntoView({ offset: { top: -250, left: 0 } })
      .should("be.visible")
      .click({ force: true });
    cy.contains("Lähetys onnistui", { timeout: 30000 });
    cy.get("#kuulutuksentiedot_tab").click();
    cy.get("#button_open_acceptance_dialog")
      .should("be.enabled")
      .scrollIntoView({ offset: { top: 500, left: 0 } })
      .should("be.visible")
      .click();
    cy.get("#accept_kuulutus").click();
    cy.contains("Hyväksyminen onnistui", { timeout: 30000 });

    cy.get("#kuulutuksentiedot_tab").click({ force: true });

    cy.contains("Kuulutus nähtäville asettamisesta on julkaistu");

    cy.visit(Cypress.env("host") + "/suunnitelma/" + oid + "/hyvaksymispaatos");
    cy.contains(asianumero);

    cy.visit(Cypress.env("host") + "/sv/suunnitelma/" + oid + "/hyvaksymispaatos");
    cy.contains(asianumero);
  });
});
