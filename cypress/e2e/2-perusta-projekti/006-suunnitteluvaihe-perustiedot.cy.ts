import { ProjektiTestCommand } from "../../../common/testUtil.dev";
import { lahetaPalaute } from "../../support/palauteTaiMuistutus";
import {
  muokkaaSuunnitteluvaiheenPerustietoja,
  muokkaaSuunnitteluvaiheenVuorovaikutuksenTietojaJaPaivitaJulkaisua,
  tallennaSuunnitteluvaiheenPerustiedot,
  tallennaSuunnitteluvaiheenVuorovaikutuksenTiedotJaJulkaise,
} from "../../support/suunnitteluvaihe";

describe("Projektin suunnitteluvaihe (perustiedot)", () => {
  const oid = Cypress.env("oid");
  const projektiNimi = Cypress.env("projektiNimi");

  before(() => {
    cy.abortEarly();
  });

  it("Tallenna suunnitteluvaiheen perustiedot", { scrollBehavior: "center" }, function () {
    const host = Cypress.env("host");
    cy.login("A1");
    // Remove most of the data from suunnitteluvaihe to enable re-tunning this test as many times as needed
    cy.visit(host + ProjektiTestCommand.oid(oid).resetSuunnitteluVaihe(), { timeout: 30000 });
    cy.contains("OK");
    // Remove vuorovaikutusjulkaisut as well to enable re-tunning this test as many times as needed
    cy.visit(host + ProjektiTestCommand.oid(oid).resetVuorovaikutukset(), { timeout: 30000 });
    cy.contains("OK");
    cy.visit(host + "/yllapito/projekti/" + oid + "/suunnittelu", { timeout: 30000 });
    cy.contains(projektiNimi);
    cy.wait(2000);

    tallennaSuunnitteluvaiheenPerustiedot();
  });

  it("Muokkaa suunnitteluvaiheen perustietoja", { scrollBehavior: "center" }, () => {
    muokkaaSuunnitteluvaiheenPerustietoja();
  });

  it("Tallenna suunnitteluvaiheen vuorovaikutuksen tiedot ja julkaise", { scrollBehavior: "center" }, function () {
    tallennaSuunnitteluvaiheenVuorovaikutuksenTiedotJaJulkaise();
  });

  it("Muokkaa suunnitteluvaiheen vuorovaikutuksen tietoja ja paivita julkaisua", { scrollBehavior: "center" }, function () {
    muokkaaSuunnitteluvaiheenVuorovaikutuksenTietojaJaPaivitaJulkaisua();
  });

  it("Suunnitteluvaiheen kansalaisnäkymä sekä palautteen jättäminen", { scrollBehavior: "center" }, () => {
    cy.visit(Cypress.env("host") + "/suunnitelma/" + oid + "/suunnittelu");
    cy.contains("Päivitetty hankkeen kuvaus Suomeksi");
    lahetaPalaute();
    cy.contains("Olemme vastaanottaneet viestisi");
    cy.get("#close_thank_you_dialog").click();
  });
});
