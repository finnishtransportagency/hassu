/// <reference types="cypress" />
import { taytaJaJulkaiseAloituskuulutus } from "./aloituskuulutus";
import { ProjektiTestCommand } from "../../../common/testUtil.dev";

const projektiNimi = Cypress.env("projektiNimi");
const oid = Cypress.env("oid");

describe("Projektin aloituskuulutus", () => {
  before(() => {
    cy.abortEarly();
    cy.login("A1");
  });

  it("Projektin aloituskuulutus", { scrollBehavior: "center" }, () => {
    cy.visit(Cypress.env("host") + ProjektiTestCommand.oid(oid).resetAloituskuulutus(), { timeout: 30000 });
    taytaJaJulkaiseAloituskuulutus(oid, projektiNimi);
  });
  it("Uudelleenkuuluta aloituskuulutus", { scrollBehavior: "center" }, () => {
    const uudelleenkuulutus = true;
    taytaJaJulkaiseAloituskuulutus(oid, projektiNimi, uudelleenkuulutus);
  });
});
