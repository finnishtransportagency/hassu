/// <reference types="cypress" />

import { ProjektiTestCommand } from "../../../common/testUtil.dev";
import { selectAllAineistotFromCategory, typeIntoFields } from "../../support/util";
import dayjs from "dayjs";
import { formatDate } from "../../../src/util/dateUtils";

const projektiNimi = Cypress.env("projektiNimi");
const oid = Cypress.env("oid");
const today = dayjs();
const kysymyksetJaPalautteetViimeistaan = formatDate(today.add(20, "day"));
const vuorovaikutusJulkaisuPaiva = formatDate(today);

describe("Projektin suunnitteluvaihe (perustiedot)", () => {
  before(() => {
    cy.abortEarly();
  });

  it("Tallenna suunnitteluvaiheen perustiedot", { scrollBehavior: "center" }, function () {
    cy.login("A1");
    // Remove most of the data from suunnitteluvaihe to enable re-tunning this test as many times as needed
    cy.visit(Cypress.env("host") + ProjektiTestCommand.oid(oid).resetSuunnitteluVaihe(), { timeout: 30000 });
    // Remove vuorovaikutusjulkaisut as well to enable re-tunning this test as many times as needed
    cy.visit(Cypress.env("host") + ProjektiTestCommand.oid(oid).resetVuorovaikutukset(), { timeout: 30000 });

    cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/suunnittelu", { timeout: 30000 });
    cy.contains(projektiNimi);
    cy.wait(2000);

    cy.get("main").then((main) => {
      let saveDraftButton = main.find("#save_suunnitteluvaihe_perustiedot");

      expect(saveDraftButton.length).to.be.greaterThan(0, "Suunnitteluvaihe not editable");
    });

    const selectorToTextMap = new Map([
      ['[name="vuorovaikutusKierros.suunnittelunEteneminenJaKesto"]', "kuvaus edistyksestä"],
      ['[name="vuorovaikutusKierros.arvioSeuraavanVaiheenAlkamisesta"]', "Alkuvuodesta 2023"],
    ]);

    cy.wait(1000);
    typeIntoFields(selectorToTextMap);
    cy.get('[name="vuorovaikutusKierros.kysymyksetJaPalautteetViimeistaan"]')
      .should("be.enabled")
      .clear()
      .type(kysymyksetJaPalautteetViimeistaan, {
        waitForAnimations: true,
      });

    cy.get("#save_suunnitteluvaihe_perustiedot").click();
    cy.contains("Tallennus onnistui").wait(2000); // extra wait added because somehow the next test brings blank aloituskuulutus page otherwise

    cy.reload();

    selectorToTextMap.forEach((text, selector) => {
      cy.get(selector, {
        timeout: 10000,
      }).should("have.value", text);
    });

    cy.visit(Cypress.env("host") + "/suunnitelma/" + oid + "/suunnittelu");

    [...selectorToTextMap.values()].forEach((text) => {
      cy.contains(text).should("not.exist");
    });

    cy.visit(Cypress.env("host") + "/sv/suunnitelma/" + oid + "/suunnittelu");
    [...selectorToTextMap.values()].forEach((text) => {
      cy.contains(text).should("not.exist");
    });
  });

  it("Muokkaa suunnitteluvaiheen perustietoja", { scrollBehavior: "center" }, () => {
    cy.login("A1");
    const selectorToTextMap = new Map([
      ['[name="vuorovaikutusKierros.suunnittelunEteneminenJaKesto"]', "Päivitetty kuvaus edistyksestä"],
      ['[name="vuorovaikutusKierros.arvioSeuraavanVaiheenAlkamisesta"]', "Alkuvuodesta 2024"],
    ]);
    cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/suunnittelu");
    cy.contains(projektiNimi);

    cy.wait(1000);

    typeIntoFields(selectorToTextMap);

    cy.get("#select_esittelyaineistot_button").click();
    selectAllAineistotFromCategory("#aineisto_accordion_Toimeksianto1");

    cy.get("#select_valitut_aineistot_button").click();
    cy.get("#select_suunnitelmaluonnokset_button").click();

    selectAllAineistotFromCategory("#aineisto_accordion_Toimeksianto1");
    cy.get("#select_valitut_aineistot_button").click();

    cy.get("#save_suunnitteluvaihe_perustiedot").click();
    cy.contains("Tallennus onnistui").wait(2000); // extra wait added because somehow the next test brings blank aloituskuulutus page otherwise
  });

  it("Tallenna suunnitteluvaiheen vuorovaikutuksen tiedot ja julkaise", { scrollBehavior: "center" }, function () {
    cy.login("A1");
    cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/suunnittelu/vuorovaikuttaminen/1");
    cy.contains(projektiNimi);
    cy.wait(2000);

    cy.get("main").then((main) => {
      let saveButton = main.find("#save_suunnitteluvaihe_vuorovaikutukset_draft");
      if (saveButton.length > 0) {
        cy.wrap(saveButton).click();
      }
    });

    const mainFormSelectorToTextMap = new Map([
      ['[name="vuorovaikutusKierros.hankkeenKuvaus.SUOMI"]', "Päivitetty hankkeen kuvaus Suomeksi"],
      ['[name="vuorovaikutusKierros.hankkeenKuvaus.RUOTSI"]', "Päivitetty hankkeen kuvaus Suomeksi"],
      ['[name="vuorovaikutusKierros.ilmoituksenVastaanottajat.kunnat.0.sahkoposti"]', "test@vayla.fi"],
      ['[name="vuorovaikutusKierros.ilmoituksenVastaanottajat.kunnat.1.sahkoposti"]', "test@vayla.fi"],
    ]);

    mainFormSelectorToTextMap.forEach((text, selector) => {
      cy.get(selector, {
        timeout: 10000,
      })
        .should("be.enabled")
        .clear()
        .type(text);
    });
    cy.get('[name="vuorovaikutusKierros.vuorovaikutusJulkaisuPaiva"]').should("be.enabled").clear().type(vuorovaikutusJulkaisuPaiva, {
      waitForAnimations: true,
    });

    cy.get("#add_or_edit_tilaisuus").click();

    cy.get(".MuiModal-root").then((main) => {
      let nimikentta = main.find('[name="vuorovaikutusTilaisuudet.0.nimi"]');
      if (nimikentta.length === 0) {
        cy.get("#add_fyysinen_tilaisuus").click();
      }
    });

    const tilaisuusSelectorToTextMap = new Map([
      ['[name="vuorovaikutusTilaisuudet.0.nimi"]', "Fyysinen tilaisuus 123"],
      ['[name="vuorovaikutusTilaisuudet.0.paivamaara"]', formatDate(dayjs().add(7, "day"))],
      ['[name="vuorovaikutusTilaisuudet.0.alkamisAika"]', "14:00"],
      ['[name="vuorovaikutusTilaisuudet.0.paattymisAika"]', "15:00"],
      ['[name="vuorovaikutusTilaisuudet.0.paikka"]', "Taistelurata"],
      ['[name="vuorovaikutusTilaisuudet.0.osoite"]', "Taisteluradantie 4026"],
      ['[name="vuorovaikutusTilaisuudet.0.postinumero"]', "00860"],
      ['[name="vuorovaikutusTilaisuudet.0.postitoimipaikka"]', "Helsinki"],
      ['[name="vuorovaikutusTilaisuudet.0.Saapumisohjeet"]', "Saapumisohje 123"],
    ]);

    tilaisuusSelectorToTextMap.forEach((text, selector) => {
      cy.get(selector, {
        timeout: 10000,
      })
        .should("be.enabled")
        .clear()
        .type(text);
    });

    cy.wait(2000).get("#save_vuorovaikutus_tilaisuudet").click();

    // TODO: Uuden yhteystiedon lisaaminen aiheuttaa talla hetkella ajonaikaisen virheen
    // TypeError: Cannot read properties of undefined (reading 'reduce')

    // cy.get("main").then((main) => {
    //   let nimikentta = main.find('[name="vuorovaikutusTilaisuudet.vuorovaikutus.esitettavatYhteystiedot.yhteysTiedot.0.etunimi"]');
    //   if (nimikentta.length === 0) {
    //     cy.get("#append_vuorovaikuttamisen_yhteystiedot_button").click();
    //   }
    // });

    // const yhteystietoSelectorToTextMap = new Map([
    //   ['[name="vuorovaikutusTilaisuudet.vuorovaikutus.esitettavatYhteystiedot.yhteysTiedot.0.etunimi"]', "Henkilöetunimi"],
    //   ['[name="vuorovaikutusTilaisuudet.vuorovaikutus.esitettavatYhteystiedot.yhteysTiedot.0.sukunimi"]', "Henkilösukunimi"],
    //   ['[name="vuorovaikutusTilaisuudet.vuorovaikutus.esitettavatYhteystiedot.yhteysTiedot.0.organisaatio"]', "Henkilöorganisaatio"],
    //   ['[name="vuorovaikutusTilaisuudet.vuorovaikutus.esitettavatYhteystiedot.yhteysTiedot.0.puhelinnumero"]', "0294444444"],
    //   ['[name="vuorovaikutusTilaisuudet.vuorovaikutus.esitettavatYhteystiedot.yhteysTiedot.0.sahkoposti"]', "henkilo@sahkoposti.fi"],
    // ]);

    // yhteystietoSelectorToTextMap.forEach((text, selector) => {
    //   cy.get(selector, {
    //     timeout: 10000,
    //   })
    //     .should("be.enabled")
    //     .clear()
    //     .type(text);
    // });

    cy.get("#save_and_publish").click();
    cy.get("#accept_and_publish_vuorovaikutus").click();

    cy.contains("Tallennus onnistui").wait(2000); // extra wait added because somehow the next test brings blank aloituskuulutus page otherwise

    cy.reload();

    // TODO: sivun tiedot eivat vastaa bakkarista tulevia jostain syysta
    // mainFormSelectorToTextMap.forEach((text) => {
    //   cy.contains(text);
    // });

    // TODO: kts yhteystieto runtime error
    // yhteystietoSelectorToTextMap.forEach((text, selector) => {
    //   cy.get(selector, {
    //     timeout: 10000,
    //   }).should("have.value", text);
    // });
  });

  it("Muokkaa suunnitteluvaiheen vuorovaikutuksen tietoja ja paivita julkaisua", { scrollBehavior: "center" }, function () {
    cy.login("A1");
    cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/suunnittelu");
    cy.contains(projektiNimi);

    const mainFormSelectorToTextMap = new Map([
      ['[name="vuorovaikutusKierros.videot.0.url"]', "https://www.uusitestilinkki.vayla.fi"],
      ['[name="vuorovaikutusKierros.suunnittelumateriaali.nimi"]', "Esittelymateriaali 12345"],
      ['[name="vuorovaikutusKierros.suunnittelumateriaali.url"]', "https://www.uusilinkkiesittelymateriaaleihin.fi"],
    ]);

    mainFormSelectorToTextMap.forEach((data, selector) => {
      const text = typeof data === "string" ? data : data.input;
      cy.get(selector, {
        timeout: 10000,
      })
        .should("be.enabled")
        .clear()
        .type(text);
    });

    cy.get("#select_esittelyaineistot_button").click();
    selectAllAineistotFromCategory("#aineisto_accordion_Toimeksianto1");
    cy.get("#select_valitut_aineistot_button").click();
    cy.get("#select_suunnitelmaluonnokset_button").click();
    selectAllAineistotFromCategory("#aineisto_accordion_Toimeksianto1");
    cy.get("#select_valitut_aineistot_button").click();

    cy.get("#save_published_suunnitteluvaihe").click();
    cy.get("#accept_publish").click();

    cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/suunnittelu/vuorovaikuttaminen/1");

    cy.get("#add_or_edit_tilaisuus").click();

    cy.get(".MuiModal-root").then((main) => {
      let nimikentta = main.find('[name="vuorovaikutusTilaisuudet.0.nimi"]');
      if (nimikentta.length === 0) {
        cy.get("#add_fyysinen_tilaisuus").click();
      }
    });

    const tilaisuusSelectorToTextMap = new Map([
      ['[name="vuorovaikutusTilaisuudet.0.nimi"]', "Fyysinen tilaisuus 12345"],
      ['[name="vuorovaikutusTilaisuudet.0.Saapumisohjeet"]', "Saapumisohje 12345"],
    ]);

    tilaisuusSelectorToTextMap.forEach((data, selector) => {
      const text = typeof data === "string" ? data : data.input;
      cy.get(selector, {
        timeout: 10000,
      })
        .should("be.enabled")
        .clear()
        .type(text);
    });

    cy.get("#save_vuorovaikutus_tilaisuudet").click();
    cy.contains("Vuorovaikutustilaisuuksien päivittäminen onnistui").wait(2000); // extra wait added because somehow the next test brings blank aloituskuulutus page otherwise

    cy.reload();
    [...tilaisuusSelectorToTextMap.values()].forEach((data) => {
      const text = typeof data === "string" ? data : data.expectedOutput;
      cy.contains(text);
    });
  });
});
