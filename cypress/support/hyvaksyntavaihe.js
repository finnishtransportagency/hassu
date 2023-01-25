import { formatDate } from "../../src/util/dateUtils";
import dayjs from "dayjs";
import { selectAllAineistotFromCategory } from "./util";

export function tallennaKasittelynTilaJaSiirraMenneisyyteen(oid, projektiNimi, asianumero) {
  cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/kasittelyntila", {
    timeout: 30000,
    retryOnNetworkFailure: true,
    retryOnStatusCodeFailure: true,
  });
  if (projektiNimi) {
    cy.contains(projektiNimi);
  }

  const paatosPvm = formatDate(dayjs().subtract(1, "hour"));

  cy.get('[name="kasittelynTila.hyvaksymispaatos.paatoksenPvm"]').should("be.enabled").clear().type(paatosPvm, {
    waitForAnimations: true,
  });
  cy.get('[name="kasittelynTila.hyvaksymispaatos.asianumero"]').clear().type(asianumero);
  cy.get("#save").click();
  cy.contains("Tallennus onnistui").wait(2000); // extra wait added because somehow the next test brings blank  page otherwise

  cy.reload();

  // Test saved values
  cy.get('[name="kasittelynTila.hyvaksymispaatos.paatoksenPvm"]').should("have.value", paatosPvm);
  cy.get('[name="kasittelynTila.hyvaksymispaatos.asianumero"]').should("have.value", asianumero);

  cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/hyvaksymispaatos", { timeout: 30000 }).reload();
  cy.contains("Kuulutus hyväksymispäätöksestä");
}

export function lisaaPaatosJaAineistot(oid, projektiNimi) {
  cy.login("A1");

  cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/hyvaksymispaatos", { timeout: 30000 });
  if (projektiNimi) {
    cy.contains(projektiNimi);
  }
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
}
