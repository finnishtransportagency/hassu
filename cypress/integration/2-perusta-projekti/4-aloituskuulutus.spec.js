/// <reference types="cypress" />
import dayjs from "dayjs";
import { capturePDFPreview, requestPDFs } from "../../support/util";

const projektiNimi = Cypress.env("projektiNimi");
const oid = Cypress.env("oid");

describe("Projektin aloituskuulutus", () => {
  before(() => {
    cy.abortEarly();
    cy.login("A1");
  });

  it("Projektin aloituskuulutus", { scrollBehavior: "center" }, () => {
    cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/aloituskuulutus");
    cy.contains(projektiNimi);

    // Make re-running the test automatic in the development by cancelling the acceptance request
    cy.get("main").then((main) => {
      let rejectButton = main.find("#button_reject");
      if (rejectButton.length > 0) {
        cy.wrap(rejectButton).click();
        cy.get('[name="syy"]').type("Palautussyy");
        cy.get("#reject_and_edit").click();
        cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/aloituskuulutus");
      }
    });

    cy.get('[name="aloitusKuulutus.kuulutusPaiva"]').should("be.enabled").type(dayjs().format("YYYY-MM-DDTHH:mm"), {
      waitForAnimations: true,
    });

    cy.get("main").then((elem) => {
      let htmlElements = elem.find('[name="contact_info_trash_button"]');
      for (const htmlElement of htmlElements) {
        htmlElement.click();
      }
    });

    cy.get("#add_new_contact").click();

    cy.get('[name="aloitusKuulutus.kuulutusYhteystiedot.yhteysTiedot.0.etunimi"]').type("Yhteystietoetunimi");
    cy.get('[name="aloitusKuulutus.kuulutusYhteystiedot.yhteysTiedot.0.sukunimi"]').type("Yhteystietosukunimi");
    cy.get('[name="aloitusKuulutus.kuulutusYhteystiedot.yhteysTiedot.0.organisaatio"]').type("Minun Organisaationi");
    cy.get('[name="aloitusKuulutus.kuulutusYhteystiedot.yhteysTiedot.0.puhelinnumero"]').type("0293333333");
    cy.get('[name="aloitusKuulutus.kuulutusYhteystiedot.yhteysTiedot.0.sahkoposti"]').type("test@vayla.fi");

    cy.get('[name="aloitusKuulutus.hankkeenKuvaus.SUOMI"]').clear({ scrollBehavior: "center" }).type("Hankkeen kuvaus Suomeksi");
    cy.get('[name="aloitusKuulutus.hankkeenKuvaus.RUOTSI"]').clear({ scrollBehavior: "center" }).type("Hankkeen kuvaus Ruotsiksi");

    cy.get("main").then((elem) => {
      let htmlElements = elem.find('[name="viranomainen_trash_button"]');
      for (const htmlElement of htmlElements) {
        htmlElement.click();
      }
    });

    cy.get("#add_new_viranomainen").click();
    cy.get('[name="aloitusKuulutus.ilmoituksenVastaanottajat.viranomaiset.0.nimi"]').select("PIRKANMAAN_ELY");

    cy.get('[name="aloitusKuulutus.ilmoituksenVastaanottajat.kunnat.0.sahkoposti"]').clear().type("test@vayla.fi");
    cy.get('[name="aloitusKuulutus.ilmoituksenVastaanottajat.kunnat.1.sahkoposti"]').clear().type("test@vayla.fi");

    const pdfs = capturePDFPreview();
    cy.get("#preview_kuulutus_pdf_SUOMI").click();
    cy.get("#preview_kuulutus_pdf_RUOTSI").click();
    cy.get("#preview_ilmoitus_pdf_SUOMI").click();
    cy.get("#preview_ilmoitus_pdf_RUOTSI").click();
    requestPDFs(pdfs);
    cy.get("#save_and_send_for_acceptance").click();
    cy.contains("Aloituskuulutus on hyväksyttävänä");
    cy.get("#button_open_acceptance_dialog")
      .should("be.enabled")
      .scrollIntoView({ offset: { top: 500, left: 0 } })
      .should("be.visible")
      .click({ force: true });
    cy.get("#accept_kuulutus").click();
    cy.contains("Aloituskuulutus on julkaistu", { timeout: 15000 });
  });
});
