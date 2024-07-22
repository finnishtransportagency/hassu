import { lisaaKarttarajaus } from "../../support/kiinteistonOmistajat";

describe("8 - Tiedotettavat kiinteistönomistajat", () => {
  const oid = Cypress.env("oid");

  before(() => {
    cy.abortEarly();
  });

  it("Lisää karttarajaus", { scrollBehavior: "center" }, () => {
    lisaaKarttarajaus(oid);
  });
});
