import { typeIntoFields } from "./util";

export function lahetaMuistutus() {
  cy.get("#feedback_button").scrollIntoView().should("be.visible").click();

  const selectorToTextMap = {
    '[name="etunimi"]': "Etunimeni",
    '[name="sukunimi"]': "Sukunimeni",
    '[name="katuosoite"]': "Jokukatu 123",
    '[name="postinumeroJaPostitoimipaikka"]': "12345 Kaupunki",
    '[name="sahkoposti"]': "test@vayla.fi",
    '[name="puhelinnumero"]': "358123456789",
    '[name="muistutus"]': "Tässä muistutusesimerkki",
  };

  typeIntoFields(selectorToTextMap);

  uploadLiite();

  cy.get("#submit_feedback").scrollIntoView().should("be.visible").click();
}

export function lahetaPalaute() {
  cy.get("#feedback_button").scrollIntoView().should("be.visible").click();

  const selectorToTextMap = {
    '[name="etunimi"]': "Etunimeni",
    '[name="sukunimi"]': "Sukunimeni",
    '[name="sahkoposti"]': "test@vayla.fi",
    '[name="puhelinnumero"]': "358123456789",
    '[name="kysymysTaiPalaute"]': "Tässä palaute-esimerkki",
  };

  typeIntoFields(selectorToTextMap);
  cy.get('[name="yhteydenottotapaEmail"]').click({ force: true });

  uploadLiite();
  cy.get("#submit_feedback").scrollIntoView().click({ force: true });
}

function uploadLiite() {
  const fileName = "logo.png";
  cy.fixture(fileName, "binary")
    .then(Cypress.Blob.binaryStringToBlob)
    .then((fileContent) => {
      cy.get("#file-input").attachFile({
        fileContent,
        fileName,
        mimeType: "image/png",
      });
    });
}
