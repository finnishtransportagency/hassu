import { VuorovaikutusTilaisuusTyyppi } from "@services/api";
import { isValidDate } from "src/util/dateUtils";
import * as Yup from "yup";
import { yhteystietoSchema } from "./yhteystieto";

const validTimeRegexp = /^([0-1]?[0-9]|2[0-4]):([0-5]?[0-9])$/;

export const vuorovaikutustilaisuudetSchema = Yup.object().shape({
  vuorovaikutusTilaisuudet: Yup.array().of(
    Yup.object().shape({
      tyyppi: Yup.mixed<VuorovaikutusTilaisuusTyyppi>().oneOf(Object.values(VuorovaikutusTilaisuusTyyppi)).required(),
      nimi: Yup.string().required("Tilaisuuden nimi täytyy antaa").nullable(),
      paivamaara: Yup.string()
        .required("Vuorovaikutustilaisuuden päivämäärä täytyy antaa")
        .test("valid-date", "Virheellinen päivämäärä", (date) => {
          return isValidDate(date);
        }),
      alkamisAika: Yup.string().required("Tilaisuuden alkamisaika täytyy antaa").matches(validTimeRegexp),
      paattymisAika: Yup.string().required("Tilaisuuden päättymisaika täytyy antaa").matches(validTimeRegexp),
      kaytettavaPalvelu: Yup.string()
        .when("tyyppi", {
          is: VuorovaikutusTilaisuusTyyppi.VERKOSSA,
          then: Yup.string().required("Verkkotilaisuudessa käytettävä palvelu täytyy valita"),
        })
        .nullable(),
      linkki: Yup.string()
        .when("tyyppi", {
          is: VuorovaikutusTilaisuusTyyppi.VERKOSSA,
          then: Yup.string().required("Verkkotilaisuuden linkki täytyy antaa"),
        })
        .nullable(),
      osoite: Yup.string()
        .when("tyyppi", {
          is: VuorovaikutusTilaisuusTyyppi.PAIKALLA,
          then: Yup.string().required("Tilaisuuden osoite täytyy antaa"),
        })
        .nullable(),
      postinumero: Yup.string()
        .when("tyyppi", {
          is: VuorovaikutusTilaisuusTyyppi.PAIKALLA,
          then: Yup.string().required("Tilaisuuden postinumero täytyy antaa"),
        })
        .nullable(),
    })
  ),
});

export const vuorovaikutusSchema = Yup.object().shape({
  oid: Yup.string().required(),
  suunnitteluVaihe: Yup.object().shape({
    vuorovaikutus: Yup.object().shape({
      vuorovaikutusNumero: Yup.number().required(),
      vuorovaikutusJulkaisuPaiva: Yup.string()
        .required("Julkaisupäivä täytyy antaa")
        .test("valid-date", "Virheellinen päivämäärä", (date) => {
          return isValidDate(date);
        }),
      kysymyksetJaPalautteetViimeistaan: Yup.string()
        .required("Toivottu palautepäivämäärä täytyy antaa")
        .test("valid-date", "Virheellinen päivämäärä", (date) => {
          return isValidDate(date);
        }),
      esitettavatYhteystiedot: Yup.array().notRequired().of(yhteystietoSchema),
      //vuorovaikutusTilaisuudet: Yup.array().notRequired().of(vuorovaikutustilaisuudetSchema),
      videot: Yup.array()
        .notRequired()
        .of(
          Yup.object().shape({
            nimi: Yup.string(),
            url: Yup.string().url("URL ei kelpaa").notRequired(),
          })
        )
        .compact(function (linkki) {
          return !linkki.url;
        }),
      suunnittelumateriaali: Yup.object()
        .notRequired()
        .shape({
          nimi: Yup.string().notRequired(),
          url: Yup.string().url("URL ei kelpaa").notRequired(),
        }),
    }),
  }),
});
