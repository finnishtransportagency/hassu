import { verifyAllDownloadLinks } from "../../support/util";

describe("Projektin aloituskuulutus kansalaisille", () => {
  const oid = Cypress.env("oid");

  before(() => {
    cy.abortEarly();
  });

  it("Aloituskuulutus näkyy kansalaisille", () => {
    cy.visit(Cypress.env("host") + "/suunnitelma/" + oid + "/aloituskuulutus");
    cy.contains("Hankkeen kuvaus Suomeksi");
    verifyAllDownloadLinks();
  });
});
