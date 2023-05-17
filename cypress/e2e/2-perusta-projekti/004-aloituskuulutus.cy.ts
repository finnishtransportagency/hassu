import { taytaJaJulkaiseAloituskuulutus } from "../../support/aloituskuulutus";
import { ProjektiTestCommand } from "../../../common/testUtil.dev";
import { verifyAllDownloadLinks } from "../../support/util";

describe("Projektin aloituskuulutus", () => {
  const projektiNimi = Cypress.env("projektiNimi");
  const oid = Cypress.env("oid");

  before(() => {
    cy.abortEarly();
  });

  it("Projektin aloituskuulutus", { scrollBehavior: "center" }, () => {
    cy.login("A1");
    cy.visit(Cypress.env("host") + ProjektiTestCommand.oid(oid).resetAloituskuulutus(), { timeout: 30000 });
    cy.reload();
    taytaJaJulkaiseAloituskuulutus(oid, projektiNimi);
    verifyAllDownloadLinks();
  });

  it("Uudelleenkuuluta aloituskuulutus", { scrollBehavior: "center" }, () => {
    cy.login("A1");
    const uudelleenkuulutus = true;
    taytaJaJulkaiseAloituskuulutus(oid, projektiNimi, uudelleenkuulutus);
    verifyAllDownloadLinks();
  });
});
