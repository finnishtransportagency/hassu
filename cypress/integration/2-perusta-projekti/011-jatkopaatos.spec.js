/// <reference types="cypress" />
import dayjs from "dayjs";
import { CLEAR_ALL, formatDate, selectAllAineistotFromCategory } from "../../support/util";
import { ProjektiTestCommand } from "../../../common/testUtil.dev";

const projektiNimi = Cypress.env("projektiNimi");
const oid = Cypress.env("oid");
const asianumero = "VÄYLÄ/1234/03.04.05/2023";

describe("11 - Projektin jatkopaatos1vaiheen kuulutustiedot", () => {
  before(() => {
    cy.abortEarly();
  });

  it("Siirra projekti epaaktiiviseksi (hyvaksymispaatos vuosi menneisyyteen)", { scrollBehavior: "center" }, function () {
    // Move hyvaksymispaatos to past +1 year
    cy.visit(Cypress.env("host") + ProjektiTestCommand.oid(oid).hyvaksymispaatosVuosiMenneisyyteen(), { timeout: 30000 });
  });

  it("Tallenna kasittelyn tilaan jatkopaatoksen pvm ja asiatunnus", { scrollBehavior: "center" }, function () {
    cy.login("A1");

    cy.visit(Cypress.env("host") + ProjektiTestCommand.oid(oid).resetJatkopaatos1vaihe(), { timeout: 30000 });
    cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/kasittelyntila", {
      timeout: 30000,
      retryOnNetworkFailure: true,
      retryOnStatusCodeFailure: true,
    });
    cy.reload(); // extra reload to avoid white page
    cy.contains(projektiNimi);

    const jatkopaatosPvm = formatDate(dayjs().subtract(1, "minute"));

    cy.get('[name="kasittelynTila.ensimmainenJatkopaatos.paatoksenPvm"]')
      .should("be.enabled")
      .type(CLEAR_ALL + jatkopaatosPvm, {
        waitForAnimations: true,
      });
    cy.get('[name="kasittelynTila.ensimmainenJatkopaatos.asianumero"]').type(CLEAR_ALL + asianumero);
    cy.get("#save").click();
    // save draft of jatkopaatos 1
    cy.contains("Tallennus onnistui").wait(1000); // extra wait added because somehow the next test brings blank  page otherwise

    cy.get("#lisaa_jatkopaatos").click(); // open dialog
    cy.get("#accept_and_save_jatkopaatos").click(); // accept
    cy.contains("Jatkopäätös lisätty!").wait(1000); // extra wait added because somehow the next test brings blank  page otherwise

    // TODO: check that user moved itself to projektin henkilot
    cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/henkilot", {
      timeout: 30000,
      retryOnNetworkFailure: true,
      retryOnStatusCodeFailure: true,
    });
    cy.get('input[name="kayttoOikeudet.0.puhelinnumero"')
      .should("be.enabled")
      .type(CLEAR_ALL + "0291111111");
    cy.get('input[name="kayttoOikeudet.1.puhelinnumero"')
      .should("be.enabled")
      .type(CLEAR_ALL + "0291111112");

    const fieldName = 'input[name="kayttoOikeudet.2.puhelinnumero"]';
    cy.get("body").then((body) => {
      if (body.find(fieldName).length > 0) {
        cy.get(fieldName).should("be.enabled").type("0291111113");
      }
    });

    cy.get("#save_projekti").click();
    cy.contains("Henkilötietojen tallennus onnistui").wait(1000); // extra wait added because somehow the next test brings blank  page otherwise

    // Test saved kasittelyntila values
    cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/kasittelyntila", {
      timeout: 30000,
      retryOnNetworkFailure: true,
      retryOnStatusCodeFailure: true,
    });

    cy.get('[name="kasittelynTila.ensimmainenJatkopaatos.paatoksenPvm"]').should("have.value", jatkopaatosPvm);
    cy.get('[name="kasittelynTila.ensimmainenJatkopaatos.asianumero"]').should("have.value", asianumero);

    // Test that navigation now has "1. jatkaminen" link

    cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/jatkaminen1/aineisto", { timeout: 30000 }).reload();
    cy.contains("Päätös ja päätöksen liitteenä oleva aineisto");
  });

  it("Lisää päätökset ja aineistot", { scrollBehavior: "center" }, () => {
    cy.login("A1");

    cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/jatkaminen1", { timeout: 30000 });
    cy.contains(projektiNimi);
    cy.get("#aineisto_tab").click({ force: true });

    cy.get("#tuo_paatos_button").click();
    selectAllAineistotFromCategory("#aineisto_accordion_Toimeksianto1");
    cy.get("#select_valitut_aineistot_button").click();

    cy.get("#aineisto_nahtavilla_import_button").click();
    selectAllAineistotFromCategory("#aineisto_accordion_Toimeksianto1");
    cy.get("#select_valitut_aineistot_button").click();

    cy.get("#kategorisoimattomat").click();

    cy.get("body").then(($body) => {
      const selector = "#kategorisoimattomat_table .category_selector select";
      const numberOfSelectElements = $body.find(selector).length;
      if (numberOfSelectElements > 0) {
        for (let i = 0; i < numberOfSelectElements; i++) {
          cy.get(selector).first().select("osa_c");
        }
      }
    });

    cy.get("#save_hyvaksymispaatosvaihe_draft").click();
    cy.contains("Tallennus onnistui").wait(2000); // extra wait added because somehow the next test brings blank  page otherwise

    cy.reload();

    cy.get("#aineisto_tab").click({ force: true });
    // Test saved paatos aineisto
    cy.get("input[type='hidden'][name='hyvaksymisPaatos.0.dokumenttiOid']").should("exist");
    cy.get("input[type='hidden'][name='hyvaksymisPaatos.0.nimi']").should("exist");

    // Test rest of the saved aineisto
    cy.get("input[type='hidden'][name ^='aineistoNahtavilla.osa_c.']").should("exist");
  });

  it("Muokkaa ja julkaise jatkopaatos 1. kuulutus", { scrollBehavior: "center" }, () => {
    // This test can not be run multiple times without first archiving projekti
    // or manually deleting jatkoPatos1VaiheJulkaisut from DB
    cy.login("A1");

    cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/jatkaminen1", { timeout: 30000 });
    cy.contains(projektiNimi);

    cy.get("#kuulutuksentiedot_tab").click();

    const today = formatDate(dayjs());
    cy.get('[name="paatos.kuulutusPaiva"]').should("be.enabled").type(today, {
      waitForAnimations: true,
    });

    const plus4years = dayjs().add(4, "year").year().toString();
    cy.get("#voimassaolovuosi").select(plus4years);

    cy.get('[name="paatos.hallintoOikeus"]').select("HELSINKI");
    cy.get('[name="paatos.ilmoituksenVastaanottajat.kunnat.0.sahkoposti"]').type(CLEAR_ALL + "test@vayla.fi");
    cy.get('[name="paatos.ilmoituksenVastaanottajat.kunnat.1.sahkoposti"]').type(CLEAR_ALL + "test@vayla.fi");

    cy.get("#save_and_send_for_acceptance", { timeout: 120000 }).should("be.enabled").click({ force: true });
    cy.contains("Lähetys onnistui", { timeout: 30000 });

    cy.get("#kuulutuksentiedot_tab").click({ force: true });
    cy.get("#button_open_acceptance_dialog")
      .should("be.enabled")
      .scrollIntoView({ offset: { top: 500, left: 0 } })
      .should("be.visible")
      .click({ force: true });
    cy.get("#accept_kuulutus").click();
    cy.contains("Hyväksyminen onnistui", { timeout: 15000 });

    cy.reload();
    cy.get("#kuulutuksentiedot_tab").click({ force: true });

    cy.contains("Kuulutus nähtäville asettamisesta on julkaistu"); //TODO: vaihda jatkovaiheen tekstit

    cy.visit(Cypress.env("host") + "/suunnitelma/" + oid + "/jatkopaatos1");
    cy.contains("Kuulutus hyväksymispäätöksen jatkamisesta");

    // cy.visit(Cypress.env("host") + "/sv/suunnitelma/" + oid + "/hyvaksymispaatos");
    // cy.contains(asianumero);
  });
});
