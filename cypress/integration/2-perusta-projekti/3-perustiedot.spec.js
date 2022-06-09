/// <reference types="cypress" />
const projektiNimi = Cypress.env("projektiNimi");
const oid = Cypress.env("oid");

describe("Projektin perustiedot", () => {
  before(() => {
    cy.login("A1");
  });

  it("Projektin perustiedot", () => {
    cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid);
    cy.contains(projektiNimi);
    cy.get('select[name="kielitiedot.ensisijainenKieli"]').should("be.enabled").select("SUOMI");
    cy.get('select[name="kielitiedot.toissijainenKieli"]').should("be.enabled").select("RUOTSI");
    cy.get('input[name="kielitiedot.projektinNimiVieraskielella"]')
      .clear()
      .type(projektiNimi + " ruotsiksi");

    cy.get('input[name="liittyviasuunnitelmia"][value="true"]').check();

    cy.get("main").then((elem) => {
      let htmlElements = elem.find('[name="linked_plan_trash_button"]');
      for (const htmlElement of htmlElements) {
        htmlElement.click();
      }
    });

    cy.get("#linked_plands_new_row").click();
    cy.get('input[name="liittyvatSuunnitelmat.0.asiatunnus"]').clear().type("abc-123");
    cy.get('input[name="liittyvatSuunnitelmat.0.nimi"]').clear().type("Ensimmäisen nimi");

    cy.get("#linked_plands_new_row").click();
    cy.get('input[name="liittyvatSuunnitelmat.1.asiatunnus"]').clear().type("abc-456");
    cy.get('input[name="liittyvatSuunnitelmat.1.nimi"]').clear().type("Toisen nimi");

    cy.get('input[name="suunnittelusopimusprojekti"][value="true"]').check();
    cy.get("#suunnittelusopimus_kunta").select("ALAJÄRVI");
    cy.get("#suunnittelusopimus_etunimi").clear().type("Etunimialajärvi");
    cy.get("#suunnittelusopimus_sukunimi").clear().type("Sukunimialajärvi");
    cy.get("#suunnittelusopimus_puhelinnumero").clear().type("029222222222222");
    cy.get("#suunnittelusopimus_sahkoposti").clear().type("test@vayla.fi");

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

    cy.get('input[name="euRahoitus"][value="true"]').check();
    cy.get('textarea[name="muistiinpano"]').clear().type("Testimuistiinpano");
    cy.get("#save").click();
    cy.contains("Tallennus onnistui").wait(2000); // extra wait added because somehow the next test brings blank aloituskuulutus page otherwise
  });
});
