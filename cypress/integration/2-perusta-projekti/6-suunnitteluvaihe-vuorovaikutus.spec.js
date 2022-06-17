/// <reference types="cypress" />
import dayjs from "dayjs";

const projektiNimi = Cypress.env("projektiNimi");
const oid = Cypress.env("oid");

describe("Projektin suunnitteluvaihe (vuorovaikutukset)", () => {
  before(() => {
    cy.login("A1");
  });

  it("Tallenna suunnitteluvaiheen vuorovaikutuksen tiedot", { scrollBehavior: "center" }, function () {
    cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/suunnittelu");
    cy.contains(projektiNimi);
    cy.wait(2000);

    cy.get("main").then((main) => {
      let vuorovaikuttaminenTab = main.find("#1_vuorovaikuttaminen_tab");
      if (vuorovaikuttaminenTab.length > 0) {
        cy.wrap(vuorovaikuttaminenTab).click();
      } else {
        this.skip();
      }
    });

    cy.get("main").then((main) => {
      let saveButton = main.find("#save_suunnitteluvaihe_vuorovaikutukset_draft");
      if (saveButton.length > 0) {
        cy.wrap(saveButton).click();
      } else {
        this.skip();
      }
    });

    const mainFormSelectorToTextMap = new Map([
      ['[name="suunnitteluVaihe.vuorovaikutus.vuorovaikutusJulkaisuPaiva"]', dayjs().format("YYYY-MM-DDTHH:mm")],
      [
        '[name="suunnitteluVaihe.vuorovaikutus.kysymyksetJaPalautteetViimeistaan"]',
        dayjs().add(30, "day").format("YYYY-MM-DDTHH:mm"),
      ],
      ['[name="suunnitteluVaihe.vuorovaikutus.videot.0.url"]', "https://www.testilinkki.vayla.fi"],
      ['[name="suunnitteluVaihe.vuorovaikutus.suunnittelumateriaali.nimi"]', "Esittelymateriaali 123"],
      [
        '[name="suunnitteluVaihe.vuorovaikutus.suunnittelumateriaali.url"]',
        "https://www.linkkiesittelymateriaaleihin.fi",
      ],
      [
        '[name="suunnitteluVaihe.vuorovaikutus.ilmoituksenVastaanottajat.kunnat.0.sahkoposti"]',
        "kunta@kunnan-sahkoposti.fi",
      ],
      [
        '[name="suunnitteluVaihe.vuorovaikutus.ilmoituksenVastaanottajat.kunnat.1.sahkoposti"]',
        "kunta@kunnan-sahkoposti.fi",
      ],
    ]);

    mainFormSelectorToTextMap.forEach((text, selector) => {
      cy.get(selector, {
        timeout: 10000,
      })
        .should("be.enabled")
        .clear()
        .type(text);
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
      ['[name="vuorovaikutusTilaisuudet.0.paivamaara"]', dayjs().add(7, "day").format("YYYY-MM-DDTHH:mm")],
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

    cy.get("#select_esittelyaineistot_button").click();
    cy.get("#aineisto_accordion_Tietomallinnus")
      .click()
      .contains("Valitse")
      .parent()
      .within(() => {
        cy.get("input[type='checkbox']").click();
      });

    cy.get("#select_valitut_aineistot_button").click();
    cy.get("#select_suunnitelmaluonnokset_button").click();
    cy.get("#aineisto_accordion_Yleinen")
      .click()
      .contains("Valitse")
      .parent()
      .within(() => {
        cy.get("input[type='checkbox']").click();
      });
    cy.get("#select_valitut_aineistot_button").click();

    cy.get("main").then((main) => {
      let nimikentta = main.find('[name="suunnitteluVaihe.vuorovaikutus.esitettavatYhteystiedot.0.etunimi"]');
      if (nimikentta.length === 0) {
        cy.get("#append_vuorovaikuttamisen_yhteystiedot_button").click();
      }
    });

    const yhteystietoSelectorToTextMap = new Map([
      ['[name="suunnitteluVaihe.vuorovaikutus.esitettavatYhteystiedot.0.etunimi"]', "Henkilöetunimi"],
      ['[name="suunnitteluVaihe.vuorovaikutus.esitettavatYhteystiedot.0.sukunimi"]', "Henkilösukunimi"],
      ['[name="suunnitteluVaihe.vuorovaikutus.esitettavatYhteystiedot.0.organisaatio"]', "Henkilöorganisaatio"],
      ['[name="suunnitteluVaihe.vuorovaikutus.esitettavatYhteystiedot.0.puhelinnumero"]', "0294444444"],
      ['[name="suunnitteluVaihe.vuorovaikutus.esitettavatYhteystiedot.0.sahkoposti"]', "henkilo@sahkoposti.fi"],
    ]);

    yhteystietoSelectorToTextMap.forEach((text, selector) => {
      cy.get(selector, {
        timeout: 10000,
      })
        .should("be.enabled")
        .clear()
        .type(text);
    });

    cy.get("#save_suunnitteluvaihe_vuorovaikutukset_draft").click();

    cy.contains("Tallennus onnistui").wait(2000); // extra wait added because somehow the next test brings blank aloituskuulutus page otherwise

    const pdfs = [];
    cy.get('[name="tallennaProjektiInput"')
      .parent()
      .then((form) => {
        cy.stub(form.get()[0], "submit")
          .callsFake((a, b, c) => {
            let action = form.get()[0].getAttribute("action");
            let tallennaProjektiInput = form.get()[0].children.namedItem("tallennaProjektiInput").getAttribute("value");
            pdfs.push({
              action: action,
              tallennaProjektiInput: tallennaProjektiInput,
            });
          })
          .as("formSubmit");
      });

    cy.get("#preview_kutsu_pdf_SUOMI").click();
    cy.get("@formSubmit")
      .should("have.been.called")
      .then(() => {
        for (const pdf of pdfs) {
          cy.request("POST", pdf.action, { tallennaProjektiInput: pdf.tallennaProjektiInput }).then((response) => {
            expect(response.status).to.eq(200);
          });
        }
      });

    cy.reload();
    cy.wait(1000).get("#1_vuorovaikuttaminen_tab").click();

    mainFormSelectorToTextMap.forEach((text, selector) => {
      cy.get(selector, {
        timeout: 10000,
      }).should("have.value", text);
    });

    yhteystietoSelectorToTextMap.forEach((text, selector) => {
      cy.get(selector, {
        timeout: 10000,
      }).should("have.value", text);
    });
  });

  it("Muokkaa ja julkaise suunnitteluvaiheen vuorovaikutuksen tiedot", { scrollBehavior: "center" }, function () {
    cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/suunnittelu");
    cy.contains(projektiNimi);

    cy.get("main").then((main) => {
      let vuorovaikuttaminenTab = main.find("#1_vuorovaikuttaminen_tab");
      if (vuorovaikuttaminenTab.length > 0) {
        cy.wrap(vuorovaikuttaminenTab).click();
      } else {
        this.skip();
      }
    });

    cy.wait(2000);

    cy.get("main").then((main) => {
      let saveButton = main.find("#save_and_publish");
      if (saveButton.length === 0) {
        this.skip();
      }
    });

    const currentTime = dayjs();
    const timeWeekAhead = currentTime.add(7, "day");
    const timeMonthAhead = currentTime.add(30, "day");

    const mainFormSelectorToTextMap = new Map([
      [
        '[name="suunnitteluVaihe.vuorovaikutus.vuorovaikutusJulkaisuPaiva"]',
        { input: currentTime.format("YYYY-MM-DDTHH:mm"), expectedOutput: currentTime.format("DD.MM.YYYY") },
      ],
      [
        '[name="suunnitteluVaihe.vuorovaikutus.kysymyksetJaPalautteetViimeistaan"]',
        { input: timeMonthAhead.format("YYYY-MM-DDTHH:mm"), expectedOutput: timeMonthAhead.format("DD.MM.YYYY") },
      ],
      ['[name="suunnitteluVaihe.vuorovaikutus.videot.0.url"]', "https://www.uusitestilinkki.vayla.fi"],
      ['[name="suunnitteluVaihe.vuorovaikutus.suunnittelumateriaali.nimi"]', "Esittelymateriaali 12345"],
      [
        '[name="suunnitteluVaihe.vuorovaikutus.suunnittelumateriaali.url"]',
        "https://www.uusilinkkiesittelymateriaaleihin.fi",
      ],
      [
        '[name="suunnitteluVaihe.vuorovaikutus.ilmoituksenVastaanottajat.kunnat.0.sahkoposti"]',
        "kunta@kunnan-uusi-sahkoposti.fi",
      ],
      [
        '[name="suunnitteluVaihe.vuorovaikutus.ilmoituksenVastaanottajat.kunnat.1.sahkoposti"]',
        "kunta@kunnan-uusi-sahkoposti.fi",
      ],
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

    cy.get("#add_or_edit_tilaisuus").click();

    cy.get(".MuiModal-root").then((main) => {
      let nimikentta = main.find('[name="vuorovaikutusTilaisuudet.0.nimi"]');
      if (nimikentta.length === 0) {
        cy.get("#add_fyysinen_tilaisuus").click();
      }
    });

    const tilaisuusSelectorToTextMap = new Map([
      ['[name="vuorovaikutusTilaisuudet.0.nimi"]', "Fyysinen tilaisuus 12345"],
      [
        '[name="vuorovaikutusTilaisuudet.0.paivamaara"]',
        { input: timeWeekAhead.format("YYYY-MM-DDTHH:mm"), expectedOutput: timeWeekAhead.format("DD.MM.YYYY") },
      ],
      ['[name="vuorovaikutusTilaisuudet.0.alkamisAika"]', "14:00"],
      ['[name="vuorovaikutusTilaisuudet.0.paattymisAika"]', "16:00"],
      ['[name="vuorovaikutusTilaisuudet.0.paikka"]', "Taistelurata"],
      ['[name="vuorovaikutusTilaisuudet.0.osoite"]', "Taisteluradantie 4040"],
      ['[name="vuorovaikutusTilaisuudet.0.postinumero"]', "00860"],
      ['[name="vuorovaikutusTilaisuudet.0.postitoimipaikka"]', "Helsinki"],
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

    cy.get("#select_esittelyaineistot_button").click();
    cy.get("#aineisto_accordion_Tietomallinnus")
      .click()
      .contains("Valitse")
      .parent()
      .within(() => {
        cy.get("input[type='checkbox']").click();
      });

    cy.get("#select_valitut_aineistot_button").click();
    cy.get("#select_suunnitelmaluonnokset_button").click();
    cy.get("#aineisto_accordion_Yleinen")
      .click()
      .contains("Valitse")
      .parent()
      .within(() => {
        cy.get("input[type='checkbox']").click();
      });
    cy.get("#select_valitut_aineistot_button").click();

    cy.get("main").then((main) => {
      let nimikentta = main.find('[name="suunnitteluVaihe.vuorovaikutus.esitettavatYhteystiedot.0.etunimi"]');
      if (nimikentta.length === 0) {
        cy.get("#append_vuorovaikuttamisen_yhteystiedot_button").click();
      }
    });

    const yhteystietoSelectorToTextMap = new Map([
      ['[name="suunnitteluVaihe.vuorovaikutus.esitettavatYhteystiedot.0.etunimi"]', "Henkilöetunimi"],
      ['[name="suunnitteluVaihe.vuorovaikutus.esitettavatYhteystiedot.0.sukunimi"]', "Henkilösukunimi"],
      ['[name="suunnitteluVaihe.vuorovaikutus.esitettavatYhteystiedot.0.organisaatio"]', "Henkilöorganisaatio"],
      ['[name="suunnitteluVaihe.vuorovaikutus.esitettavatYhteystiedot.0.puhelinnumero"]', "0294444444"],
      [
        '[name="suunnitteluVaihe.vuorovaikutus.esitettavatYhteystiedot.0.sahkoposti"]',
        { input: "henkilo@sahkoposti.fi", expectedOutput: "henkilo[at]sahkoposti.fi" },
      ],
    ]);

    yhteystietoSelectorToTextMap.forEach((data, selector) => {
      const text = typeof data === "string" ? data : data.input;
      cy.get(selector, {
        timeout: 10000,
      })
        .should("be.enabled")
        .clear()
        .type(text);
    });

    cy.get("#save_and_publish").click();
    cy.get("#accept_and_publish_vuorovaikutus").click();

    cy.contains("Tallennus onnistui").wait(2000); // extra wait added because somehow the next test brings blank aloituskuulutus page otherwise

    cy.reload();
    cy.wait(2000).get("#1_vuorovaikuttaminen_tab").click();
    [
      ...mainFormSelectorToTextMap.values(),
      ...yhteystietoSelectorToTextMap.values(),
      ...tilaisuusSelectorToTextMap.values(),
    ].forEach((data) => {
      const text = typeof data === "string" ? data : data.expectedOutput;
      cy.contains(text);
    });
  });
});
