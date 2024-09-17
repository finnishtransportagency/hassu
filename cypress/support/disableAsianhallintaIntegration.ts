import { CLEAR_ALL } from "./util";

export const disableAsianhallintaIntegration = (oid: string) => {
  cy.login("A1");
  cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid);
  cy.get('input[name="kustannuspaikka"]').type(CLEAR_ALL + "TESTIVIITE");
  cy.get("input[name='asianhallinta.inaktiivinen']").uncheck();
  cy.get("#save").click();
  cy.contains("Tallennus onnistui").wait(2000);
};
