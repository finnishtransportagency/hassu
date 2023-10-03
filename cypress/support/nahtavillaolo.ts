import * as dayjs from "dayjs";
import { formatDate, selectAllAineistotFromCategory, typeIntoFields } from "./util";

export function taytaNahtavillaoloPerustiedot(oid, selectorToTextMap: Record<string, string>) {
  cy.get("#kuulutuksentiedot_tab").click({ force: true });

  // Reject acceptance request and clear most of the data from nahtavillaolovaihe through API
  // to enable re-tunning this test as many times as needed
  cy.get("main").then((main) => {
    let rejectButton = main.find("#button_reject");
    if (rejectButton.length > 0) {
      cy.wrap(rejectButton).click();
      cy.get('[name="syy"]').type("Palautussyy");
      cy.get("#reject_and_edit").click();
      cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/nahtavillaolo");
    }
  });

  const today = formatDate(dayjs());

  cy.get('[name="nahtavillaoloVaihe.kuulutusPaiva"]').should("be.enabled").type(today, {
    waitForAnimations: true,
    force: true,
  });

  cy.wait(1000);

  typeIntoFields(selectorToTextMap);

  cy.get("#save_draft")
    .should("be.enabled")
    .scrollIntoView({ offset: { top: 1500, left: 0 } })
    .click();
  cy.contains("Tallennus onnistui").wait(2000); // extra wait added because somehow the next test brings blank  page otherwise

  cy.reload();

  // Test saved values
  cy.get("#kuulutuksentiedot_tab").click({ force: true });
  cy.get('[name="nahtavillaoloVaihe.kuulutusPaiva"]').should("have.value", today);

  Object.entries(selectorToTextMap).forEach(([selector, text]) => {
    cy.get(selector, {
      timeout: 10000,
    }).should("have.value", text);
  });
}

export function lisaaNahtavillaoloAineistot(oid) {
  // This test had to be inserted here and can not be done
  // after publishing test below
  cy.login("A1");

  cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/nahtavillaolo", { timeout: 30000 });
  cy.get("#aineisto_tab").click({ force: true });

  cy.get("#aineisto_nahtavilla_import_button").click();
  selectAllAineistotFromCategory("#aineisto_accordion_Toimeksianto1");
  cy.get("#select_valitut_aineistot_button").click();
  cy.get("#kategorisoimattomat").click();

  cy.get("body").then(($body) => {
    const selector = "#kategorisoimattomat_table .category_selector select";
    const numberOfSelectElements = $body.find(selector).length;
    if (numberOfSelectElements > 0) {
      for (let i = 0; i < numberOfSelectElements; i++) {
        cy.get(selector).first().select("osa_a");
      }
    }
  });

  cy.get("#open_lisaaineisto_button").click();
  selectAllAineistotFromCategory("#aineisto_accordion_Toimeksianto1");
  cy.get("#select_valitut_aineistot_button").click();

  cy.get("#kategorisoimattomat").click();

  cy.get("body").then(($body) => {
    const selector = "#kategorisoimattomat_table .category_selector select";
    const numberOfSelectElements = $body.find(selector).length;
    if (numberOfSelectElements > 0) {
      for (let i = 0; i < numberOfSelectElements; i++) {
        cy.get(selector).first().select("osa_a");
      }
    }
  });

  cy.get("#save_draft")
    .should("be.enabled")
    .scrollIntoView({ offset: { top: 500, left: 0 } })
    .click();
  cy.contains("Tallennus onnistui").wait(2000); // extra wait added because somehow the next test brings blank  page otherwise
}

export function hyvaksyNahtavillaoloKuulutus() {
  cy.get("#save_and_send_for_acceptance", { timeout: 120000 }).should("be.enabled").click();
  cy.contains("Lähetys onnistui");
  cy.get("#button_open_acceptance_dialog")
    .should("be.enabled")
    .scrollIntoView({ offset: { top: 500, left: 0 } })
    .should("be.visible")
    .click({ force: true });
  cy.get("#accept_kuulutus").click();
  cy.contains("Hyväksyminen onnistui", { timeout: 15000 });

  cy.reload();
  cy.get("#kuulutuksentiedot_tab").click({ force: true });

  cy.contains("Kuulutus on julkaistu");
}
