/// <reference types="cypress" />

import { ProjektiTestCommand } from "../../../common/testUtil.dev";
import {
  tallennaSuunnitteluvaiheenPerustiedot,
  tallennaSuunnitteluvaiheenVuorovaikutuksenTiedotJaJulkaise,
} from "../../support/suunnitteluvaihe";

const oid = Cypress.env("oid");

describe("Projektin suunnitteluvaihe (uusi vuorovaikutuskierros)", () => {
  before(() => {
    cy.abortEarly();
  });

  it("Luo uusi vuorovaikutuskierros", { scrollBehavior: "center" }, function () {
    const host = Cypress.env("host");
    const projektiNimi = Cypress.env("projektiNimi");
    cy.login("A1");
    // Remove most of the data from suunnitteluvaihe to enable re-tunning this test as many times as needed
    cy.visit(host + ProjektiTestCommand.oid(oid).vuorovaikutusKierrosMenneisyyteen(), { timeout: 30000 });

    cy.visit(host + "/yllapito/projekti/" + oid + "/suunnittelu", { timeout: 30000 });
    cy.contains(projektiNimi);
    cy.wait(2000);

    cy.get("#uusi_kutsu_button").click();
    cy.get("#accept_luo_uusi_kutsu_button", { timeout: 15000 }).click();
  });

  it("Tallenna suunnitteluvaiheen perustiedot", { scrollBehavior: "center" }, function () {
    tallennaSuunnitteluvaiheenPerustiedot();
  });

  it("Tallenna suunnitteluvaiheen vuorovaikutuksen tiedot ja julkaise", { scrollBehavior: "center" }, function () {
    tallennaSuunnitteluvaiheenVuorovaikutuksenTiedotJaJulkaise();
  });
});
