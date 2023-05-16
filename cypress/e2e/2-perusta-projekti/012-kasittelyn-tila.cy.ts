import * as dayjs from "dayjs";
import { CLEAR_ALL, formatDate } from "../../support/util";

const projektiNimi = Cypress.env("projektiNimi");
const oid = Cypress.env("oid");
const today = dayjs();
const enakkotarkasutsPvm = formatDate(today.subtract(2, "day"));
const neuvotteluPvm = formatDate(today.subtract(1, "day"));
const hyvaksymisesitysTraficomiinPvm = formatDate(today);
const lainvoimaAlkaen = formatDate(today.add(1, "day"));
const lainvoimaPaattyen = formatDate(today.add(2, "day"));
const toimitusPvm = formatDate(today.add(3, "day"));
const luovutusOsittainPvm = formatDate(today.add(4, "day"));
const luovutusKokonaanPvm = formatDate(today.add(5, "day"));
const lisatietoteksti = "Käsittelyn tilanne päivitetään seurantapalverin jälkeen";
const valitustenMaara = "3";

describe("Kasittelyn tila", () => {
  beforeEach(() => {
    cy.abortEarly();
    cy.login("A1");
  });

  it("Tayta ja tallenna avoimet kentat", () => {
    // Suunnitelman tila
    cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/kasittelyntila");
    cy.contains("Käsittelyn tila");
    cy.contains(projektiNimi);
    cy.get("#suunnitelmanTila").select("Suunnittelu käynnissä");

    // Hyvaksymiskasittelyn tila
    cy.get('[name="kasittelynTila.ennakkotarkastus"]')
      .should("be.enabled")
      .type(CLEAR_ALL + enakkotarkasutsPvm, {
        waitForAnimations: true,
      });
    cy.get('[name="kasittelynTila.ennakkoneuvotteluPaiva"]')
      .should("be.enabled")
      .type(CLEAR_ALL + neuvotteluPvm, {
        waitForAnimations: true,
      });
    cy.get('[name="kasittelynTila.hyvaksymisesitysTraficomiinPaiva"]')
      .should("be.enabled")
      .type(CLEAR_ALL + hyvaksymisesitysTraficomiinPvm, {
        waitForAnimations: true,
      });

    // Hyvaksymispaatos ja jatkopaatos 1 taytetaan jo muissa testitapauksissa
    // Valitukset
    cy.get("#valituksetCheckbox").check({ force: true });
    cy.get('input[name="kasittelynTila.valitustenMaara"').type(CLEAR_ALL + valitustenMaara);

    // Lainvoima
    cy.get('[name="kasittelynTila.lainvoimaAlkaen"]')
      .should("be.enabled")
      .type(CLEAR_ALL + lainvoimaAlkaen, {
        waitForAnimations: true,
      });
    cy.get('[name="kasittelynTila.lainvoimaPaattyen"]')
      .should("be.enabled")
      .type(CLEAR_ALL + lainvoimaPaattyen, {
        waitForAnimations: true,
      });

    // Toimitus ja luovutus
    cy.get('[name="kasittelynTila.toimitusKaynnistynyt"]')
      .should("be.enabled")
      .type(CLEAR_ALL + toimitusPvm, {
        waitForAnimations: true,
      });
    cy.get('[name="kasittelynTila.liikenteeseenluovutusOsittain"]')
      .should("be.enabled")
      .type(CLEAR_ALL + luovutusOsittainPvm, {
        waitForAnimations: true,
      });
    cy.get('[name="kasittelynTila.liikenteeseenluovutusKokonaan"]')
      .should("be.enabled")
      .type(CLEAR_ALL + luovutusKokonaanPvm, {
        waitForAnimations: true,
      });

    // Listatieto
    cy.get('[name="kasittelynTila.lisatieto"]').type(CLEAR_ALL + lisatietoteksti);

    // Tallennus
    cy.get("#save").click();
    cy.contains("Tallennus onnistui");
  });

  it("Tarkista tallennetut tiedot", () => {
    cy.visit(Cypress.env("host") + "/yllapito/projekti/" + oid + "/kasittelyntila");
    cy.get("#suunnitelmanTila").select("Suunnittelu käynnissä");

    cy.get('[name="kasittelynTila.ennakkotarkastus"]').should("have.value", enakkotarkasutsPvm);
    cy.get('[name="kasittelynTila.ennakkoneuvotteluPaiva"]').should("have.value", neuvotteluPvm);
    cy.get('[name="kasittelynTila.hyvaksymisesitysTraficomiinPaiva"]').should("have.value", hyvaksymisesitysTraficomiinPvm);

    cy.get("#valituksetCheckbox").should("be.checked");
    cy.get('input[name="kasittelynTila.valitustenMaara"').should("have.value", valitustenMaara);

    cy.get('[name="kasittelynTila.lainvoimaAlkaen"]').should("have.value", lainvoimaAlkaen);
    cy.get('[name="kasittelynTila.lainvoimaPaattyen"]').should("have.value", lainvoimaPaattyen);

    cy.get('[name="kasittelynTila.toimitusKaynnistynyt"]').should("have.value", toimitusPvm);
    cy.get('[name="kasittelynTila.liikenteeseenluovutusOsittain"]').should("have.value", luovutusOsittainPvm);
    cy.get('[name="kasittelynTila.liikenteeseenluovutusKokonaan"]').should("have.value", luovutusKokonaanPvm);

    cy.get('[name="kasittelynTila.lisatieto"]').should("have.value", lisatietoteksti);
  });

  it.skip("Tarkista tietojen tallennus velhoon", () => {
    // TODO: tarkistus velhosta tai rajapinnasta joskus?
  });

  it.skip("Lisaa jatkopaatos2", () => {
    // TODO
  });
});
