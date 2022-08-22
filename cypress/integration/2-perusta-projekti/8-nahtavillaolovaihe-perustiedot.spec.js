/// <reference types="cypress" />
import dayjs from "dayjs";

const projektiNimi = Cypress.env("projektiNimi");
const oid = Cypress.env("oid");

describe("Projektin nahtavillaolovaiheen kuulutustiedot", () => {
  before(() => {
    cy.abortEarly();
  });

  it("Tallenna nahtavillaolon kuulutustiedot", { scrollBehavior: "center" }, function () {
    cy.login("A1");
    cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/nahtavillaolo", { timeout: 30000 });
    cy.contains(projektiNimi);

    // Reject acceptance request and clear most of the data from nahtavillaolovaihe through API
    // to enable re-tunning this test as many times as needed
    cy.get("#kuulutuksentiedot_tab").click();

    cy.get("main").then((main) => {
      let rejectButton = main.find("#button_reject");
      if (rejectButton.length > 0) {
        cy.wrap(rejectButton).click();
        cy.get('[name="syy"]').type("Palautussyy");
        cy.get("#reject_and_edit").click();
        cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/nahtavillaolo");
      }
    });

    cy.request({
      method: "POST",
      url: Cypress.env("host") + "/yllapito/graphql",
      headers: {
        "x-api-key": Cypress.env("apiKey"),
      },
      body: {
        operationName: "ClearNahtavillaolo",
        variables: {},
        query: `mutation ClearNahtavillaolo {
            tallennaProjekti(
              projekti: {
                oid: "${oid}"
                nahtavillaoloVaihe: {
                  kuulutusPaiva: null
                  kuulutusVaihePaattyyPaiva: null
                  muistutusoikeusPaattyyPaiva: null
                  hankkeenKuvaus: { SUOMI: "" }
                  kuulutusYhteysHenkilot: null
                  lisaAineisto:null
                  aineistoNahtavilla:null
                }
              }
            )
          }`,
      },
    });

    const today = dayjs().format("YYYY-MM-DDTHH:mm");

    cy.get('[name="nahtavillaoloVaihe.kuulutusPaiva"]').should("be.enabled").type(today, {
      waitForAnimations: true,
    });

    const selectorToTextMap = new Map([
      ['[name="nahtavillaoloVaihe.hankkeenKuvaus.SUOMI"]', "nahtavillaolovaiheen kuvaus Suomeksi"],
      ['[name="nahtavillaoloVaihe.hankkeenKuvaus.RUOTSI"]', "nahtavillaolovaiheen kuvaus Ruotsiksi"],
      ['[name="nahtavillaoloVaihe.ilmoituksenVastaanottajat.kunnat.0.sahkoposti"]', "test@vayla.fi"],
      ['[name="nahtavillaoloVaihe.ilmoituksenVastaanottajat.kunnat.1.sahkoposti"]', "test@vayla.fi"],
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

    cy.get("#save_nahtavillaolovaihe_draft").click();
    cy.contains("Tallennus onnistui").wait(2000); // extra wait added because somehow the next test brings blank  page otherwise

    cy.reload();

    // Test saved values
    cy.get("#kuulutuksentiedot_tab").click();
    cy.get('[name="nahtavillaoloVaihe.kuulutusPaiva"]').should("have.value", today);

    selectorToTextMap.forEach((text, selector) => {
      cy.get(selector, {
        timeout: 10000,
      }).should("have.value", text);
    });

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

  it("Muokkaa ja julkaise suunnitteluvaiheen perustiedot", { scrollBehavior: "center" }, () => {
    // This test can not be run multiple times without first archiving projekti
    // or manually deleting nahtavillaoloVaiheJulkaisut from DB
    cy.login("A1");

    cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/nahtavillaolo", { timeout: 30000 });
    cy.contains(projektiNimi);

    cy.get("#kuulutuksentiedot_tab").click();

    const selectorToTextMap = new Map([
      ['[name="nahtavillaoloVaihe.hankkeenKuvaus.SUOMI"]', "Päivitetty hankkeen kuvaus Suomeksi"],
      ['[name="nahtavillaoloVaihe.hankkeenKuvaus.RUOTSI"]', "Päivitetty hankkeen kuvaus Ruotsiksi"],
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

    cy.get("#save_and_send_for_acceptance").click();
    cy.contains("Lähetys onnistui");
    cy.get("#button_open_acceptance_dialog")
      .should("be.enabled")
      .scrollIntoView({ offset: { top: 500, left: 0 } })
      .should("be.visible")
      .click({ force: true });
    cy.get("#accept_kuulutus").click();
    cy.contains("Hyväksyminen onnistui", { timeout: 15000 });

    cy.reload();
    cy.get("#kuulutuksentiedot_tab").click();

    cy.contains("Kuulutus nähtäville asettamisesta on julkaistu");

    cy.visit(Cypress.env("host") + "/suunnitelma/" + oid + "/nahtavillaolo");
    cy.contains("Päivitetty hankkeen kuvaus Suomeksi");

    cy.visit(Cypress.env("host") + "/sv/suunnitelma/" + oid + "/nahtavillaolo");
    cy.contains("Päivitetty hankkeen kuvaus Ruotsiksi");
  });
});
