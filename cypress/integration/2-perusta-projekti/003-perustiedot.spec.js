/// <reference types="cypress" />
import { CLEAR_ALL } from "../../support/util";

const projektiNimi = Cypress.env("projektiNimi");
const oid = Cypress.env("oid");

describe("Projektin perustiedot", () => {
  before(() => {
    cy.abortEarly();
    cy.login("A1");
  });

  it("Projektin perustiedot", () => {
    cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid);
    cy.contains(projektiNimi);
    cy.wait(1000);
    cy.get('select[name="kielitiedot.ensisijainenKieli"]').should("be.enabled").select("SUOMI");
    cy.get('select[name="kielitiedot.toissijainenKieli"]').should("be.enabled").select("RUOTSI");
    cy.get('input[name="kielitiedot.projektinNimiVieraskielella"]').type(CLEAR_ALL + projektiNimi + " ruotsiksi");

    cy.get('input[name="liittyviasuunnitelmia"][value="true"]').check();

    cy.get("main").then((elem) => {
      let htmlElements = elem.find('[name="linked_plan_trash_button"]');
      for (const htmlElement of htmlElements) {
        htmlElement.click();
      }
    });

    cy.get("#linked_plands_new_row").click();
    cy.get('input[name="liittyvatSuunnitelmat.0.asiatunnus"]').type(CLEAR_ALL + "abc-123");
    cy.get('input[name="liittyvatSuunnitelmat.0.nimi"]').type(CLEAR_ALL + "Ensimmäisen nimi");

    cy.get("#linked_plands_new_row").click();
    cy.get('input[name="liittyvatSuunnitelmat.1.asiatunnus"]').type(CLEAR_ALL + "abc-456");
    cy.get('input[name="liittyvatSuunnitelmat.1.nimi"]').type(CLEAR_ALL + "Toisen nimi");

    cy.get('input[name="suunnittelusopimusprojekti"][value="true"]').check();
    cy.get("#suunnittelusopimus_kunta").select("Alajärvi");
    cy.get("#suunnittelusopimus_yhteyshenkilo").select(1);

    cy.get("main").then((elem) => {
      let htmlElements = elem.find('[name="suunnittelusopimus_logo_trash_button"]');
      for (const htmlElement of htmlElements) {
        htmlElement.click();
      }
    });

    const fileName = "logo.png";
    cy.fixture(fileName, "binary")
      .then(Cypress.Blob.binaryStringToBlob)
      .then((fileContent) => {
        cy.get('[name="fileInput"]').attachFile({
          fileContent,
          fileName,
        });
      });

    cy.get('input[name="euRahoitusProjekti"][value="true"]').check();

    cy.get("main").then((elem) => {
      let htmlElements = elem.find('[name="eu_logo_trash_button_SUOMI"]');
      for (const htmlElement of htmlElements) {
        htmlElement.click();
      }
    });

    const eufileName = "eu-logo.jpg";
    cy.fixture(eufileName, "binary")
      .then(Cypress.Blob.binaryStringToBlob)
      .then((fileContent) => {
        cy.get('[name="fileInput"]').attachFile({
          fileContent,
          fileName: eufileName,
        });
      });

    cy.get("main").then((elem) => {
      let htmlElements = elem.find('[name="eu_logo_trash_button_RUOTSI"]');
      for (const htmlElement of htmlElements) {
        htmlElement.click();
      }
    });

    cy.fixture(eufileName, "binary")
      .then(Cypress.Blob.binaryStringToBlob)
      .then((fileContent) => {
        cy.get('[name="fileInput"]').attachFile({
          fileContent,
          fileName: eufileName,
        });
      });

    cy.get('textarea[name="muistiinpano"]').type(CLEAR_ALL + "Testimuistiinpano");
    cy.get("#save").click();
    cy.contains("Tallennus onnistui").wait(2000); // extra wait added because somehow the next test brings blank aloituskuulutus page otherwise
  });
});
