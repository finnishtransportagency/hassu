import { CLEAR_ALL, formatDate, selectAllAineistotFromCategory, typeIntoFields } from "./util";
import * as dayjs from "dayjs";

const today = dayjs();
const kysymyksetJaPalautteetViimeistaan = formatDate(today.add(20, "day"));
const vuorovaikutusJulkaisuPaiva = formatDate(today);
const projektiNimi = Cypress.env("projektiNimi");
const oid = Cypress.env("oid");
const host = Cypress.env("host");

export function tallennaSuunnitteluvaiheenPerustiedot() {
  cy.visit(host + "/yllapito/projekti/" + oid + "/suunnittelu", { timeout: 30000 });
  cy.contains(projektiNimi);
  cy.wait(2000);

  cy.get("main").then((main) => {
    let saveDraftButton = main.find("#save_suunnitteluvaihe_perustiedot");

    expect(saveDraftButton.length).to.be.greaterThan(0, "Suunnitteluvaihe not editable");
  });

  const selectorToTextMap: Record<string, string> = {
    '[name="vuorovaikutusKierros.suunnittelunEteneminenJaKesto.SUOMI"]': "kuvaus edistyksestä",
    '[name="vuorovaikutusKierros.suunnittelunEteneminenJaKesto.RUOTSI"]': "RUOTSIKSI kuvaus edistyksestä",
    '[name="vuorovaikutusKierros.arvioSeuraavanVaiheenAlkamisesta.SUOMI"]': "Alkuvuodesta 2023",
    '[name="vuorovaikutusKierros.arvioSeuraavanVaiheenAlkamisesta.RUOTSI"]': "RUOTSIKSI Alkuvuodesta 2023",
  };

  cy.wait(1000);
  typeIntoFields(selectorToTextMap);
  cy.get('[name="vuorovaikutusKierros.kysymyksetJaPalautteetViimeistaan"]')
    .should("be.enabled")
    .type(CLEAR_ALL + kysymyksetJaPalautteetViimeistaan, {
      waitForAnimations: true,
    });

  cy.get("#save_suunnitteluvaihe_perustiedot").click();
  cy.contains("Tallennus onnistui").wait(2000); // extra wait added because somehow the next test brings blank aloituskuulutus page otherwise

  Object.entries(selectorToTextMap).forEach(([selector, text]) => {
    cy.get(selector, {
      timeout: 10000,
    }).should("have.value", text);
  });

  cy.visit(host + "/suunnitelma/" + oid + "/suunnittelu");

  Object.values(selectorToTextMap).forEach((text) => {
    cy.contains(text).should("not.exist");
  });

  cy.visit(host + "/sv/suunnitelma/" + oid + "/suunnittelu");
  Object.values(selectorToTextMap).forEach((text) => {
    cy.contains(text).should("not.exist");
  });
}

export function muokkaaSuunnitteluvaiheenPerustietoja() {
  cy.login("A1");
  const selectorToTextMap = {
    '[name="vuorovaikutusKierros.suunnittelunEteneminenJaKesto.SUOMI"]': "Päivitetty kuvaus edistyksestä",
    '[name="vuorovaikutusKierros.arvioSeuraavanVaiheenAlkamisesta.SUOMI"]': "Alkuvuodesta 2024",
    '[name="vuorovaikutusKierros.suunnittelunEteneminenJaKesto.RUOTSI"]': "RUOTSIKSI Päivitetty kuvaus edistyksestä",
    '[name="vuorovaikutusKierros.arvioSeuraavanVaiheenAlkamisesta.RUOTSI"]': "RUOTSIKSI Alkuvuodesta 2024",
  };
  cy.visit(host + "/yllapito/projekti/" + oid + "/suunnittelu");
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
}

export function tallennaSuunnitteluvaiheenVuorovaikutuksenTiedotJaJulkaise() {
  cy.login("A1");
  cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/suunnittelu/vuorovaikuttaminen");
  cy.contains(projektiNimi);
  cy.wait(2000);

  cy.get("main").then((main) => {
    let saveButton = main.find("#save_suunnitteluvaihe_vuorovaikutukset_draft");
    if (saveButton.length > 0) {
      cy.wrap(saveButton).click();
    }
  });

  const mainFormSelectorToTextMap = {
    '[name="vuorovaikutusKierros.hankkeenKuvaus.SUOMI"]': "Päivitetty hankkeen kuvaus Suomeksi",
    '[name="vuorovaikutusKierros.hankkeenKuvaus.RUOTSI"]': "Päivitetty hankkeen kuvaus Suomeksi",
    '[name="vuorovaikutusKierros.ilmoituksenVastaanottajat.kunnat.0.sahkoposti"]': "test@vayla.fi",
    '[name="vuorovaikutusKierros.ilmoituksenVastaanottajat.kunnat.1.sahkoposti"]': "test@vayla.fi",
  };

  Object.entries(mainFormSelectorToTextMap).forEach(([selector, text]) => {
    cy.get(selector, {
      timeout: 10000,
    })
      .should("be.enabled")
      .type(CLEAR_ALL + text);
  });
  cy.get('[name="vuorovaikutusKierros.vuorovaikutusJulkaisuPaiva"]')
    .should("be.enabled")
    .type(CLEAR_ALL + vuorovaikutusJulkaisuPaiva, {
      waitForAnimations: true,
    });

  cy.wait(1000); // Odotellaan, jotta softa saa haettua käyttäjän oikeudet

  cy.get("#add_or_edit_tilaisuus").click();

  cy.get(".MuiModal-root").then((main) => {
    let nimikentta = main.find('[name="vuorovaikutusTilaisuudet.0.nimi"]');
    if (nimikentta.length === 0) {
      cy.get("#add_fyysinen_tilaisuus").click();
    }
  });

  const tilaisuusSelectorToTextMap = {
    '[name="vuorovaikutusTilaisuudet.0.nimi.SUOMI"]': CLEAR_ALL + "Fyysinen tilaisuus 123",
    '[name="vuorovaikutusTilaisuudet.0.nimi.RUOTSI"]': CLEAR_ALL + "RUOTSIKSI Fyysinen tilaisuus 123",
    '[name="vuorovaikutusTilaisuudet.0.paivamaara"]': formatDate(dayjs().add(7, "day")),
    '[name="vuorovaikutusTilaisuudet.0.alkamisAika"]': "14:00",
    '[name="vuorovaikutusTilaisuudet.0.paattymisAika"]': "15:00",
    '[name="vuorovaikutusTilaisuudet.0.paikka.SUOMI"]': CLEAR_ALL + "Taistelurata",
    '[name="vuorovaikutusTilaisuudet.0.osoite.SUOMI"]': CLEAR_ALL + "Taisteluradantie 4026",
    '[name="vuorovaikutusTilaisuudet.0.paikka.RUOTSI"]': CLEAR_ALL + "RUOTSIKSI Taistelurata",
    '[name="vuorovaikutusTilaisuudet.0.osoite.RUOTSI"]': CLEAR_ALL + "RUOTSIKSI Taisteluradantie 4026",
    '[name="vuorovaikutusTilaisuudet.0.postinumero"]': CLEAR_ALL + "00860",
    '[name="vuorovaikutusTilaisuudet.0.postitoimipaikka.SUOMI"]': CLEAR_ALL + "Helsinki",
    '[name="vuorovaikutusTilaisuudet.0.lisatiedot.SUOMI"]': CLEAR_ALL + "lisatiedot 123",
    '[name="vuorovaikutusTilaisuudet.0.postitoimipaikka.RUOTSI"]': CLEAR_ALL + "Helsingfors",
    '[name="vuorovaikutusTilaisuudet.0.lisatiedot.RUOTSI"]': CLEAR_ALL + "RUOTSIKSI lisatiedot 123",
  };

  Object.entries(tilaisuusSelectorToTextMap).forEach(([selector, text]) => {
    cy.get(selector, {
      timeout: 10000,
    })
      .should("be.enabled")
      .type(text);
  });

  cy.wait(2000).get("#save_vuorovaikutus_tilaisuudet").click();

  cy.get("body").then(($body) => {
    const seloste = $body.find('[name="vuorovaikutusKierros.selosteVuorovaikutuskierrokselle"]');
    if (seloste.length > 0) {
      cy.wrap(seloste)
        .should("be.enabled")
        .type(CLEAR_ALL + "Seloste 123");
    }
  });

  cy.get("#save_and_publish").click();
  cy.get("#accept_and_publish_vuorovaikutus").click();

  cy.contains("Lähetys onnistui").wait(2000); // extra wait added because somehow the next test brings blank aloituskuulutus page otherwise
}

export function muokkaaSuunnitteluvaiheenVuorovaikutuksenTietojaJaPaivitaJulkaisua() {
  cy.login("A1");
  cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/suunnittelu");
  cy.contains(projektiNimi);

  const mainFormSelectorToTextMap = {
    '[name="vuorovaikutusKierros.videot.0.SUOMI.url"]': "https://www.uusitestilinkki.vayla.fi",
    '[name="vuorovaikutusKierros.videot.0.RUOTSI.url"]': "https://www.uusitestilinkki.vayla.fi/sv",
    '[name="vuorovaikutusKierros.suunnittelumateriaali.0.SUOMI.nimi"]': "Esittelymateriaali 12345",
    '[name="vuorovaikutusKierros.suunnittelumateriaali.0.SUOMI.url"]': "https://www.uusilinkkiesittelymateriaaleihin.fi",
    '[name="vuorovaikutusKierros.suunnittelumateriaali.0.RUOTSI.nimi"]': "RUOTSIKSI Esittelymateriaali 12345",
    '[name="vuorovaikutusKierros.suunnittelumateriaali.0.RUOTSI.url"]': "https://www.uusilinkkiesittelymateriaaleihin.fi/sv",
  };

  Object.entries(mainFormSelectorToTextMap).forEach(([selector, text]) => {
    cy.get(selector, {
      timeout: 10000,
    })
      .as("vuorovaikutusKierrosInput")
      .should("be.enabled");
    cy.get("@vuorovaikutusKierrosInput").type(CLEAR_ALL + text);
  });

  cy.get("#select_esittelyaineistot_button").click();
  selectAllAineistotFromCategory("#aineisto_accordion_Toimeksianto1");
  cy.get("#select_valitut_aineistot_button").click();
  cy.get("#select_suunnitelmaluonnokset_button").click();
  selectAllAineistotFromCategory("#aineisto_accordion_Toimeksianto1");
  cy.get("#select_valitut_aineistot_button").click();

  cy.get("#save_published_suunnitteluvaihe").click();
  cy.get("#accept_publish").click();
  cy.contains("Julkaisu onnistui");
  cy.visit(host + "/yllapito/projekti/" + oid + "/suunnittelu/vuorovaikuttaminen");

  cy.get("#add_or_edit_tilaisuus").click();

  cy.get(".MuiModal-root").then((main) => {
    let nimikentta = main.find('[name="vuorovaikutusTilaisuudet.0.nimi.SUOMI"]');
    if (nimikentta.length === 0) {
      cy.get("#add_fyysinen_tilaisuus").click();
    }
  });

  const tilaisuusSelectorToTextMap = {
    '[name="vuorovaikutusTilaisuudet.0.nimi.SUOMI"]': "Fyysinen tilaisuus 12345",
    '[name="vuorovaikutusTilaisuudet.0.lisatiedot.SUOMI"]': "lisatiedot 12345",
    '[name="vuorovaikutusTilaisuudet.0.nimi.RUOTSI"]': "RUOTSIKSI Fyysinen tilaisuus 12345",
    '[name="vuorovaikutusTilaisuudet.0.lisatiedot.RUOTSI"]': "RUOTSIKSI lisatiedot 12345",
  };

  Object.entries(tilaisuusSelectorToTextMap).forEach(([selector, text]) => {
    cy.get(selector, {
      timeout: 10000,
    })
      .should("be.enabled")
      .type(CLEAR_ALL + text);
  });

  cy.get("#save_vuorovaikutus_tilaisuudet").click();
  cy.contains("Vuorovaikutustilaisuuksien päivittäminen onnistui").wait(2000); // extra wait added because somehow the next test brings blank aloituskuulutus page otherwise

  Object.values(tilaisuusSelectorToTextMap).forEach((text) => {
    if (!text.includes("RUOTSIKSI")) {
      cy.contains(text);
    }
  });
}
