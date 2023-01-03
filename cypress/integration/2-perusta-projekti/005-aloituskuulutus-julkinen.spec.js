/// <reference types="cypress" />
import { verifyAllDownloadLinks } from "../../support/util";

const oid = Cypress.env("oid");

describe("Projektin aloituskuulutus kansalaisille", () => {
  before(() => {
    cy.abortEarly();
  });

  it("Aloituskuulutus näkyy kansalaisille", () => {
    cy.visit(Cypress.env("host") + "/suunnitelma/" + oid + "/aloituskuulutus");
    cy.contains("Hankkeen kuvaus Suomeksi");
    verifyAllDownloadLinks();
  });
});
