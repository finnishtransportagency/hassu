/*
1.2.246.578.5.1.2983738467.1825323454	SUUNNITTELU
1.2.246.578.5.1.2574551391.2902330452	NAHTAVILLAOLO
1.2.246.578.5.1.2789861876.697619507	HYVAKSYMISMENETTELYSSA
1.2.246.578.5.1.2572523015.2790590568	EPÄAKTIIVINEN
 */

import { ProjektiTestCommand } from "../../../common/testUtil.dev";
import { CLEAR_ALL, formatDate, selectFromDropdown, typeIntoFields } from "../../support/util";
import { hyvaksyNahtavillaoloKuulutus, lisaaNahtavillaoloAineistot, taytaNahtavillaoloPerustiedot } from "../../support/nahtavillaolo";
import { lisaaPaatosJaAineistot, tallennaKasittelynTilaJaSiirraMenneisyyteen } from "../../support/hyvaksyntavaihe";
import * as dayjs from "dayjs";
import { lisaaKarttarajaus } from "../../support/kiinteistonOmistajat";

function syotaPuhelinnumerot(oid) {
  cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/henkilot");
  cy.contains("Projektin henkilöt", { timeout: 30000 });
  cy.get('input[name="kayttoOikeudet.0.puhelinnumero"]').should("be.enabled").type("0291111111");
  cy.get('input[name="kayttoOikeudet.1.puhelinnumero"]').should("be.enabled").type("0291111111");

  const fieldName = 'input[name="kayttoOikeudet.2.puhelinnumero"]';
  cy.get("body").then((body) => {
    if (body.find(fieldName).length > 0) {
      cy.get(fieldName).should("be.enabled").type("0291111111");
    }
  });
  cy.get("#save_projekti").click();
  cy.contains("Henkilötietojen tallennus onnistui", { timeout: 30000 }).wait(2000);
}

describe("Migraatio", () => {
  const today = dayjs();
  const kysymyksetJaPalautteetViimeistaan = formatDate(today.add(20, "day"));
  const vuorovaikutusJulkaisuPaiva = formatDate(today);
  const suunnitelmanHallinnollinenKasittelyOnAlkanutEnnen = "Suunnitelman hallinnollinen käsittely on alkanut ennen";

  beforeEach(() => {
    cy.abortEarly();
  });

  before(() => {
    Cypress.config("scrollBehavior", "nearest");
    Cypress.config("keystrokeDelay", 0);
  });

  it("Migraatio suunnitteluvaiheeseen", () => {
    const oid = "1.2.246.578.5.1.2983738467.1825323454";
    cy.login("A1");
    cy.archiveProjekti(oid);
    cy.visit(Cypress.env("host") + ProjektiTestCommand.oid(oid).migroi("SUUNNITTELU"), { timeout: 30000 });
    cy.contains("OK");
    cy.wait(2000);
    syotaPuhelinnumerot(oid);
    //
    cy.get("#sidenavi_aloituskuulutus").click({ force: true });
    cy.contains(
      "Suunnitelman hallinnollinen käsittely on alkanut ennen Valtion liikenneväylien suunnittelu -palvelun käyttöönottoa, joten kuulutuksen tietoja ei ole saatavilla palvelusta."
    );
    cy.get("#sidenavi_suunnittelu").should("be.visible").click({ force: true });
    cy.get("h1").should("contain", "Suunnittelu");

    typeIntoFields({
      '[name="vuorovaikutusKierros.suunnittelunEteneminenJaKesto.SUOMI"]': "kuvaus edistyksestä",
      '[name="vuorovaikutusKierros.arvioSeuraavanVaiheenAlkamisesta.SUOMI"]': "Alkuvuodesta 2023",
    });

    cy.get('[name="vuorovaikutusKierros.kysymyksetJaPalautteetViimeistaan"]')
      .should("be.enabled")
      .type(CLEAR_ALL + kysymyksetJaPalautteetViimeistaan, {
        waitForAnimations: true,
      });

    cy.get("#save_suunnitteluvaihe_perustiedot_and_redirect").click();
    cy.contains("Tallennus onnistui").wait(2000); // extra wait added because somehow the next test brings blank aloituskuulutus page otherwise
    cy.get("main").contains("Kutsu vuorovaikutukseen");
    cy.wait(1000);
    cy.get('[name="vuorovaikutusKierros.vuorovaikutusJulkaisuPaiva"]')
      .scrollIntoView({ offset: { top: -250, left: 0 } })
      .should("be.visible")
      .should("be.enabled");

    cy.get('[name="vuorovaikutusKierros.vuorovaikutusJulkaisuPaiva"]')
      .scrollIntoView({ offset: { top: -250, left: 0 } })
      .should("be.visible")
      .should("be.enabled")
      .clear({ force: true });
    cy.get('[name="vuorovaikutusKierros.vuorovaikutusJulkaisuPaiva"]').type(vuorovaikutusJulkaisuPaiva, {
      waitForAnimations: true,
    });

    const mainFormSelectorToTextMap = new Map([
      ['[name="vuorovaikutusKierros.hankkeenKuvaus.SUOMI"]', "Päivitetty hankkeen kuvaus Suomeksi"],
      ['[name="vuorovaikutusKierros.ilmoituksenVastaanottajat.kunnat.0.sahkoposti"]', "test@vayla.fi"],
    ]);

    mainFormSelectorToTextMap.forEach((text, selector) => {
      cy.get(selector, {
        timeout: 10000,
      })
        .scrollIntoView({ offset: { top: -250, left: 0 } })
        .should("be.enabled")
        .type(CLEAR_ALL + text, {
          waitForAnimations: true,
        });
    });
    cy.wait(500);
    cy.get("#add_or_edit_tilaisuus")
      .should("be.enabled")
      .scrollIntoView({ offset: { top: -250, left: 0 } })
      .should("be.visible")
      .click({ force: true });

    cy.get(".MuiModal-root").then((main) => {
      let nimikentta = main.find('[name="vuorovaikutusTilaisuudet.0.nimi"]');
      if (nimikentta.length === 0) {
        cy.get("#add_fyysinen_tilaisuus").click();
      }
    });

    const tilaisuusSelectorToTextMap = new Map([
      ['[name="vuorovaikutusTilaisuudet.0.nimi.SUOMI"]', CLEAR_ALL + "Fyysinen tilaisuus 123"],
      ['[name="vuorovaikutusTilaisuudet.0.paivamaara"]', formatDate(dayjs().add(7, "day"))],
      ['[name="vuorovaikutusTilaisuudet.0.alkamisAika"]', "14:00"],
      ['[name="vuorovaikutusTilaisuudet.0.paattymisAika"]', "15:00"],
      ['[name="vuorovaikutusTilaisuudet.0.paikka.SUOMI"]', CLEAR_ALL + "Taistelurata"],
      ['[name="vuorovaikutusTilaisuudet.0.osoite.SUOMI"]', CLEAR_ALL + "Taisteluradantie 4026"],
      ['[name="vuorovaikutusTilaisuudet.0.postinumero"]', CLEAR_ALL + "00860"],
      ['[name="vuorovaikutusTilaisuudet.0.postitoimipaikka.SUOMI"]', CLEAR_ALL + "Helsinki"],
      ['[name="vuorovaikutusTilaisuudet.0.lisatiedot.SUOMI"]', CLEAR_ALL + "lisatiedot 123"],
    ]);

    tilaisuusSelectorToTextMap.forEach((text, selector) => {
      cy.get(selector, {
        timeout: 10000,
      })
        .should("be.enabled")
        .type(text);
    });

    cy.wait(2000)
      .get("#save_vuorovaikutus_tilaisuudet")
      .scrollIntoView({ offset: { top: -150, left: 0 } })
      .click();

    cy.get("#save_and_publish")
      .scrollIntoView({ offset: { top: -150, left: 0 } })
      .should("be.visible")
      .should("be.enabled")
      .click();
    cy.get("#accept_and_publish_vuorovaikutus").click();
    cy.contains("Lähetys onnistui");
  });

  it("Migraatio suunnitteluvaiheeseen kansalaisnäkymä", () => {
    const oid = "1.2.246.578.5.1.2983738467.1825323454";
    cy.visit(Cypress.env("host") + "/suunnitelma/" + oid);

    cy.contains("Navigoi vaiheita").scrollIntoView({ offset: { top: -100, left: 0 } });
    cy.get("p").contains("Navigoi vaiheita").click();

    cy.get("#sidenavi_0").should("exist").click({ force: true });
    cy.contains(suunnitelmanHallinnollinenKasittelyOnAlkanutEnnen);

    cy.get("#sidenavi_1").should("exist");
    cy.get("#sidenavi_2").should("not.exist");
  });

  it("Migraatio nähtävilläolovaiheeseen", () => {
    const oid = "1.2.246.578.5.1.2574551391.2902330452";
    cy.login("A1");
    cy.archiveProjekti(oid);
    cy.visit(Cypress.env("host") + ProjektiTestCommand.oid(oid).migroi("NAHTAVILLAOLO"), { timeout: 30000 });
    cy.contains("OK");
    cy.wait(2000);
    syotaPuhelinnumerot(oid);

    cy.get("#sidenavi_aloituskuulutus").click({ force: true });
    cy.contains(
      "Suunnitelman hallinnollinen käsittely on alkanut ennen Valtion liikenneväylien suunnittelu -palvelun käyttöönottoa, joten kuulutuksen tietoja ei ole saatavilla palvelusta."
    );
    cy.get("#sidenavi_suunnittelu").click({ force: true });
    cy.get("h1").should("contain", "Suunnittelu");
    cy.contains(
      "Suunnitelman hallinnollinen käsittely on alkanut ennen Valtion liikenneväylien suunnittelu -palvelun käyttöönottoa, joten kuulutuksen tietoja ei ole saatavilla palvelusta."
    );

    lisaaKarttarajaus(oid);

    // Täytä nähtävilläolovaihe
    cy.get("#sidenavi_nahtavillaolovaihe").click({ force: true });

    lisaaNahtavillaoloAineistot({
      oid,
      aineistoNahtavilla: { toimeksianto: "Toimeksianto1" },
      kategoria: "osa_a",
    });
    const today = formatDate(dayjs());
    const selectorToTextMap = {
      '[name="nahtavillaoloVaihe.kuulutusPaiva"]': today,
      '[name="nahtavillaoloVaihe.hankkeenKuvaus.SUOMI"]': "nahtavillaolovaiheen kuvaus Suomeksi",
      '[name="nahtavillaoloVaihe.ilmoituksenVastaanottajat.kunnat.0.sahkoposti"]': "test@vayla.fi",
      '[name="nahtavillaoloVaihe.ilmoituksenVastaanottajat.kunnat.1.sahkoposti"]': "test@vayla.fi",
    };
    taytaNahtavillaoloPerustiedot(oid, selectorToTextMap);
    cy.get("#kuulutuksentiedot_tab").click({ force: true });
    hyvaksyNahtavillaoloKuulutus();
  });

  it("Migraatio nähtävilläolovaiheeseen kansalaisnäkymä", () => {
    const oid = "1.2.246.578.5.1.2574551391.2902330452";
    cy.visit(Cypress.env("host") + "/suunnitelma/" + oid);

    cy.wait(10000);

    cy.contains("Navigoi vaiheita").scrollIntoView({ offset: { top: -100, left: 0 } });
    cy.get("p").contains("Navigoi vaiheita").click();

    cy.get("#sidenavi_0").should("exist").click({ force: true });
    cy.contains(suunnitelmanHallinnollinenKasittelyOnAlkanutEnnen);
    cy.get("#sidenavi_1").should("exist").click({ force: true });
    cy.contains(suunnitelmanHallinnollinenKasittelyOnAlkanutEnnen);
    cy.get("#sidenavi_2").should("exist").click({ force: true });
    cy.contains("Kuulutus suunnitelman nähtäville asettamisesta");
  });

  it("Migraatio hyväksymismenettelyssä-vaiheeseen", () => {
    const oid = "1.2.246.578.5.1.2789861876.697619507";
    cy.login("A1");
    cy.archiveProjekti(oid);
    cy.visit(Cypress.env("host") + ProjektiTestCommand.oid(oid).migroi("HYVAKSYMISMENETTELYSSA"), {
      timeout: 30000,
    });
    cy.contains("OK");
    cy.wait(2000);
    syotaPuhelinnumerot(oid);

    cy.get("#sidenavi_aloituskuulutus").click({ force: true });
    cy.contains(
      "Suunnitelman hallinnollinen käsittely on alkanut ennen Valtion liikenneväylien suunnittelu -palvelun käyttöönottoa, joten kuulutuksen tietoja ei ole saatavilla palvelusta."
    );

    cy.get("#sidenavi_suunnittelu").click({ force: true });
    cy.get("h1").should("contain", "Suunnittelu");
    cy.contains(
      "Suunnitelman hallinnollinen käsittely on alkanut ennen Valtion liikenneväylien suunnittelu -palvelun käyttöönottoa, joten kuulutuksen tietoja ei ole saatavilla palvelusta."
    );

    cy.get("#sidenavi_nahtavillaolovaihe").click({ force: true });
    cy.get("h1").should("contain", "Kuulutus nähtäville asettamisesta");
    cy.contains(
      "Suunnitelman hallinnollinen käsittely on alkanut ennen Valtion liikenneväylien suunnittelu -palvelun käyttöönottoa, joten kuulutuksen tietoja ei ole saatavilla palvelusta."
    );

    lisaaKarttarajaus(oid);

    cy.get("#sidenavi_hyvaksyminen").click({ force: true });

    cy.contains("Kuulutus hyväksymispäätöksestä");

    tallennaKasittelynTilaJaSiirraMenneisyyteen(oid, undefined, "asianumero123");

    lisaaPaatosJaAineistot(oid);

    // This test can not be run multiple times without first archiving projekti
    // or manually deleting hyvaksymisPaatosVaiheJulkaisut from DB
    cy.login("A1");

    cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/hyvaksymispaatos", { timeout: 30000 });

    cy.get("#kuulutuksentiedot_tab").click({ force: true });

    const today = formatDate(dayjs());
    cy.get('[name="paatos.kuulutusPaiva"]').should("be.enabled").type(today, {
      waitForAnimations: true,
    });

    selectFromDropdown("#mui-component-select-paatos\\.hallintoOikeus", "Helsingin hallinto-oikeus");
    cy.get('[name="paatos.ilmoituksenVastaanottajat.kunnat.0.sahkoposti"]').type(CLEAR_ALL + "test@vayla.fi");
    cy.get('[name="paatos.ilmoituksenVastaanottajat.kunnat.1.sahkoposti"]').type(CLEAR_ALL + "test@vayla.fi");

    cy.get("#save_and_send_for_acceptance", { timeout: 120000 }).should("be.enabled").click({ force: true });
    cy.contains("Tallennus ja hyväksyttäväksi lähettäminen onnistui", { timeout: 30000 });
    cy.get("#kuulutuksentiedot_tab").click({ force: true });
    cy.get("#button_open_acceptance_dialog")
      .should("be.enabled")
      .scrollIntoView({ offset: { top: 500, left: 0 } })
      .should("be.visible")
      .click({ force: true });
    cy.get("#accept_kuulutus").click({ force: true });
    cy.contains("Hyväksyminen onnistui", { timeout: 30000 });
  });

  it("Migraatio hyväksymismenettelyssä-vaiheeseen kansalaisnäkymä", () => {
    const oid = "1.2.246.578.5.1.2789861876.697619507";
    cy.visit(Cypress.env("host") + "/suunnitelma/" + oid, { timeout: 30000 });

    cy.contains("Kuulutus suunnitelman hyväksymisestä");

    cy.contains("Navigoi vaiheita").scrollIntoView({ offset: { top: -100, left: 0 } });
    cy.get("p").contains("Navigoi vaiheita").click();

    cy.get("#sidenavi_0").should("exist").click({ force: true });
    cy.contains("span", "Suunnittelun käynnistäminen");
    cy.contains(suunnitelmanHallinnollinenKasittelyOnAlkanutEnnen);
    cy.get("#sidenavi_1").should("exist").click({ force: true });
    cy.contains("span", "Suunnittelussa");
    cy.contains(suunnitelmanHallinnollinenKasittelyOnAlkanutEnnen);
    cy.get("#sidenavi_2").should("exist").click({ force: true });
    cy.contains("h2", "Kuulutus suunnitelman nähtäville asettamisesta");
    cy.contains(suunnitelmanHallinnollinenKasittelyOnAlkanutEnnen);
    cy.get("#sidenavi_3").should("exist").click({ force: true });
    cy.contains("span", "Hyväksymismenettelyssä");
    cy.contains("Suunnitelma on siirtynyt viimeistelyyn ja hyväksymiseen");
  });

  it("Migraatio epäaktiivinen-vaiheeseen", () => {
    const oid = "1.2.246.578.5.1.2572523015.2790590568";
    cy.login("A1");
    cy.archiveProjekti(oid);
    cy.visit(Cypress.env("host") + ProjektiTestCommand.oid(oid).migroi("EPAAKTIIVINEN_1"), {
      timeout: 30000,
    });
    cy.contains("OK");
    cy.wait(2000);
    syotaPuhelinnumerot(oid);

    cy.get("#sidenavi_aloituskuulutus").click({ force: true });
    cy.contains(
      "Suunnitelman hallinnollinen käsittely on alkanut ennen Valtion liikenneväylien suunnittelu -palvelun käyttöönottoa, joten kuulutuksen tietoja ei ole saatavilla palvelusta."
    );

    cy.get("#sidenavi_suunnittelu").click({ force: true });
    cy.get("h1").should("contain", "Suunnittelu");
    cy.contains(
      "Suunnitelman hallinnollinen käsittely on alkanut ennen Valtion liikenneväylien suunnittelu -palvelun käyttöönottoa, joten kuulutuksen tietoja ei ole saatavilla palvelusta."
    );

    cy.get("#sidenavi_nahtavillaolovaihe").click({ force: true });
    cy.get("h1").should("contain", "Kuulutus nähtäville asettamisesta");
    cy.contains(
      "Suunnitelman hallinnollinen käsittely on alkanut ennen Valtion liikenneväylien suunnittelu -palvelun käyttöönottoa, joten kuulutuksen tietoja ei ole saatavilla palvelusta."
    );

    cy.get("#sidenavi_hyvaksyminen").click({ force: true });
    cy.contains(
      "Suunnitelman hallinnollinen käsittely on alkanut ennen Valtion liikenneväylien suunnittelu -palvelun käyttöönottoa, joten kuulutuksen tietoja ei ole saatavilla palvelusta."
    );

    cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/kasittelyntila", {
      timeout: 30000,
      retryOnNetworkFailure: true,
      retryOnStatusCodeFailure: true,
    });

    cy.get('[name="kasittelynTila.hyvaksymispaatos.paatoksenPvm"]')
      .should("be.enabled")
      .type(CLEAR_ALL + "01.10.2022", {
        waitForAnimations: true,
      });
    cy.get('[name="kasittelynTila.hyvaksymispaatos.asianumero"]').type(CLEAR_ALL + "asianumero123");
    cy.get("#save").click();

    cy.get('[name="kasittelynTila.ensimmainenJatkopaatos.paatoksenPvm"]')
      .should("be.enabled")
      .type(CLEAR_ALL + "01.10.2022", {
        waitForAnimations: true,
      });
    cy.get('[name="kasittelynTila.ensimmainenJatkopaatos.asianumero"]').type(CLEAR_ALL + "asianumero123");
    cy.get("#lisaa_jatkopaatos").click();
    cy.get("#accept_and_save_jatkopaatos").click();
    cy.contains("Jatkopäätös lisätty").wait(2000);
    cy.get("#sidenavi_1_jatkopaatos").should("exist");
  });
});
