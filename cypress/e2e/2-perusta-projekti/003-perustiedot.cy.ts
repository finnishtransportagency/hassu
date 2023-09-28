import { CLEAR_ALL, selectFromDropdown } from "../../support/util";

describe("Projektin perustiedot", () => {
  const projektiNimi = Cypress.env("projektiNimi");
  const oid = Cypress.env("oid");

  before(() => {
    cy.abortEarly();
    cy.login("A1");
  });

  it("Projektin perustiedot", () => {
    cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid);
    cy.contains(projektiNimi);
    cy.wait(1000);
    selectFromDropdown("#kielitiedot\\.ensisijainenKieli", "suomi");
    selectFromDropdown("#kielitiedot\\.toissijainenKieli", "ruotsi");
    cy.get('input[name="kielitiedot.projektinNimiVieraskielella"]').type(CLEAR_ALL + projektiNimi + " ruotsiksi");

    cy.get('input[name="liittyviasuunnitelmia"][value="true"]').check();

    cy.get("main").then((elem) => {
      let htmlElements = elem.find('[name="linked_plan_trash_button"]').get();
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
      const svHtmlElements = elem.find('[name="suunnitteluSopimus.logo.RUOTSI_trash_button"]').get();
      for (const htmlElement of svHtmlElements) {
        htmlElement.click();
      }
      const fiHtmlElements = elem.find('[name="suunnitteluSopimus.logo.SUOMI_trash_button"]').get();
      for (const htmlElement of fiHtmlElements) {
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
          mimeType: "image/png",
        });
      });

    cy.get('input[name="euRahoitus"][value="true"]').check();

    cy.get("main").then((elem) => {
      let htmlElements = elem.find('[name="euRahoitusLogot.SUOMI_trash_button"]').get();
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
          mimeType: "image/jpg",
        });
      });

    cy.get("main").then((elem) => {
      let htmlElements = elem.find('[name="euRahoitusLogot.RUOTSI_trash_button"]').get();
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
          mimeType: "image/jpg",
        });
      });

    cy.fixture(eufileName, "binary")
      .then(Cypress.Blob.binaryStringToBlob)
      .then((fileContent) => {
        cy.get('[name="fileInput"]').attachFile({
          fileContent,
          fileName: eufileName,
          mimeType: "image/jpg",
        });
      });

    cy.get('textarea[name="muistiinpano"]').type(CLEAR_ALL + "Testimuistiinpano");
    cy.get("#save").click();
    cy.contains("Tallennus onnistui").wait(2000); // extra wait added because somehow the next test brings blank aloituskuulutus page otherwise
  });
});
