export const lisaaKarttarajaus = (oid: string) => {
  cy.login("A1");
  cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/tiedottaminen/kiinteistonomistajat");
  cy.get("#create-map-selection").click();

  zoomIn(7);

  cy.get(".ol-draw-polygon").click();

  cy.get("#kiinteiston-omistaja-map").click(450, 50).click(450, 150).click(390, 250).click(800, 250).click(850, 250).click(850, 250);

  cy.get("#save_map_and_search").click();

  cy.get("#processing-kiinteistonomistajat-dialog").should("not.exist");
  cy.get("#processing-kiinteistonomistajat-dialog").should("exist");
  cy.get("#processing-kiinteistonomistajat-dialog").should("not.exist");
  cy.get(".MuiAlert-filledError", { timeout: 2000 }).should("not.exist");
};

function zoomIn(times: number) {
  if (times <= 0) {
    return;
  }
  const newTimes = times - 1;
  cy.get(".ol-zoom-in").click();
  if (newTimes > 0) {
    zoomIn(newTimes);
  }
}
