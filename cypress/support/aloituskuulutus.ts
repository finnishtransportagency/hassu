import { capturePDFPreview, CLEAR_ALL, formatDate, requestPDFs, selectFromDropdown } from "./util";

export function taytaJaJulkaiseAloituskuulutus(oid, projektiNimi, uudelleenkuulutus?: boolean) {
  cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/aloituskuulutus");
  cy.contains(projektiNimi);

  if (uudelleenkuulutus) {
    cy.get("#uudelleenkuuluta_button").click();
    cy.get("#avaa_uudelleenkuulutettavaksi", { timeout: 15000 }).click();
    cy.get('[name="aloitusKuulutus.uudelleenKuulutus.selosteKuulutukselle.SUOMI"]', { timeout: 15000 }).type(
      "Selostetta kuulutukselle suomeksi"
    );
    cy.get('[name="aloitusKuulutus.uudelleenKuulutus.selosteKuulutukselle.RUOTSI"]').type("Selostetta kuulutukselle ruotsiksi");
    cy.get('[name="aloitusKuulutus.uudelleenKuulutus.selosteLahetekirjeeseen.SUOMI"]').type("Selostetta lähetekirjeeseen suomeksi");
    cy.get('[name="aloitusKuulutus.uudelleenKuulutus.selosteLahetekirjeeseen.RUOTSI"]').type("Selostetta lähetekirjeeseen ruotsiksi");
  }

  cy.get('[name="aloitusKuulutus.kuulutusPaiva"]').should("be.enabled").type(formatDate(), {
    waitForAnimations: true,
  });

  cy.get("main").then((elem) => {
    let htmlElements = elem.find('[name="contact_info_trash_button"]').get();
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

  cy.get('[name="aloitusKuulutus.hankkeenKuvaus.SUOMI"]').type(CLEAR_ALL + "Hankkeen kuvaus Suomeksi", { scrollBehavior: "center" });
  cy.get('[name="aloitusKuulutus.hankkeenKuvaus.RUOTSI"]').type(CLEAR_ALL + "Hankkeen kuvaus Ruotsiksi", { scrollBehavior: "center" });

  cy.get("main").then((elem) => {
    let htmlElements = elem.find('[name="viranomainen_trash_button"]').get();
    for (const htmlElement of htmlElements) {
      htmlElement.click();
    }
  });

  selectFromDropdown(
    "#mui-component-select-aloitusKuulutus\\.ilmoituksenVastaanottajat\\.viranomaiset\\.0\\.nimi",
    "Pirkanmaan ELY-keskus"
  );

  cy.get('[name="aloitusKuulutus.ilmoituksenVastaanottajat.kunnat.0.sahkoposti"]').type(CLEAR_ALL + "test@vayla.fi");
  cy.get('[name="aloitusKuulutus.ilmoituksenVastaanottajat.kunnat.1.sahkoposti"]').type(CLEAR_ALL + "test@vayla.fi");

  const pdfs = capturePDFPreview();
  cy.get("#preview_kuulutus_pdf_SUOMI").click();
  cy.get("#preview_kuulutus_pdf_RUOTSI").click();
  cy.get("#preview_ilmoitus_pdf_SUOMI").click();
  cy.get("#preview_ilmoitus_pdf_RUOTSI").click();
  requestPDFs(pdfs);
  cy.get("#save_and_send_for_acceptance").should("be.enabled").click({ force: true });
  cy.contains("Aloituskuulutus on hyväksyttävänä");
  cy.get("#button_open_acceptance_dialog")
    .should("be.enabled")
    .scrollIntoView({ offset: { top: 500, left: 0 } })
    .should("be.visible")
    .click({ force: true });
  cy.get("#accept_kuulutus").click();
  cy.contains("Aloituskuulutus on julkaistu", { timeout: 15000 });
}
