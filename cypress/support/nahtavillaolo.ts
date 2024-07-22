import { selectAllAineistotFromCategory, selectAineistotFromCategory, typeIntoFields } from "./util";

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

  cy.wait(3000);

  typeIntoFields(selectorToTextMap);

  cy.get("#save_draft")
    .should("be.enabled")
    .scrollIntoView({ offset: { top: 1500, left: 0 } })
    .click();
  cy.contains("Tallennus onnistui").wait(2000); // extra wait added because somehow the next test brings blank  page otherwise

  cy.reload();

  // Test saved values
  cy.get("#kuulutuksentiedot_tab").click({ force: true });

  Object.entries(selectorToTextMap).forEach(([selector, text]) => {
    cy.get(selector, {
      timeout: 10000,
    }).should("have.value", text);
  });
}

export function avaaAineistonMuokkaus(oid) {
  cy.login("A1");
  cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/nahtavillaolo", { timeout: 30000 });
  cy.get("#aineisto_tab").click({ force: true });
  cy.get("#avaa_aineiston_muokkaus").click({ force: true });
  cy.get("#jatka_aineiston_muokkaus").click({ force: true });
  cy.contains("Aineistot avattu muokattavaksi").wait(2000);
}

export function suljeAineistonMuokkaus(oid) {
  cy.login("A1");
  cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/nahtavillaolo", { timeout: 30000 });
  cy.get("#aineisto_tab").click({ force: true });
  cy.get("#poistu_aineiston_muokkaus").click({ force: true });
  cy.get("#accept_poistu_aineiston_muokkaus").click({ force: true });
  cy.contains("Aineistojen muokkaustila suljettu").wait(2000);
}

type AineistoLisaysOptions = {
  toimeksianto: string;
  aineistojenNimet?: string[];
};

type LisaaNahtavillaoloAineistotOptions = {
  oid: string;
  aineistoNahtavilla: AineistoLisaysOptions;
  kategoria: string;
};

export function lisaaNahtavillaoloAineistot({ oid, aineistoNahtavilla, kategoria }: LisaaNahtavillaoloAineistotOptions) {
  // This test had to be inserted here and can not be done
  // after publishing test below
  cy.login("A1");

  cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/nahtavillaolo", { timeout: 30000 });
  cy.get("#aineisto_tab").click({ force: true });

  cy.get("#aineisto_nahtavilla_import_button").click();
  if (aineistoNahtavilla.aineistojenNimet) {
    selectAineistotFromCategory(`#aineisto_accordion_${aineistoNahtavilla.toimeksianto}`, aineistoNahtavilla.aineistojenNimet);
  } else {
    selectAllAineistotFromCategory(`#aineisto_accordion_${aineistoNahtavilla.toimeksianto}`);
  }
  cy.get("#select_valitut_aineistot_button").click();
  cy.get("#kategorisoimattomat").click();

  moveKategorisoimattomatToKategoria(kategoria);

  cy.get("#save_draft")
    .should("be.enabled")
    .scrollIntoView({ offset: { top: 500, left: 0 } })
    .click();
  cy.get(".MuiAlert-filledSuccess").contains("Tallennus onnistui");
  cy.get(".MuiAlert-filledSuccess").should("not.exist");
}

type HyvaksyNahtavillaoloKuulutusOptions = {
  kuulutusPaivaInFuture?: boolean;
};

function moveKategorisoimattomatToKategoria(kategoria: string) {
  cy.get("body").then(($body) => {
    const selector = "#kategorisoimattomat_table .category_selector select";
    if ($body.find(selector).length === 0) {
      return;
    }
    cy.get(selector).first().select(kategoria);
    if ($body.find(selector).length > 0) {
      moveKategorisoimattomatToKategoria(kategoria);
    }
  });
}

export function hyvaksyNahtavillaoloKuulutus(
  { kuulutusPaivaInFuture }: HyvaksyNahtavillaoloKuulutusOptions = { kuulutusPaivaInFuture: false }
) {
  cy.get("#save_and_send_for_acceptance", { timeout: 120000 }).should("be.enabled").click();
  cy.contains("Tallennus ja hyväksyttäväksi lähettäminen onnistui");
  cy.get("#button_open_acceptance_dialog")
    .should("be.enabled")
    .scrollIntoView({ offset: { top: 500, left: 0 } })
    .should("be.visible")
    .click({ force: true });
  cy.get("#accept_kuulutus").click();
  cy.contains("Hyväksyminen onnistui", { timeout: 15000 });

  cy.reload();
  cy.get("#kuulutuksentiedot_tab").click({ force: true });

  cy.contains(kuulutusPaivaInFuture ? "Kuulutusta ei ole vielä julkaistu." : "Kuulutus on julkaistu");
}
