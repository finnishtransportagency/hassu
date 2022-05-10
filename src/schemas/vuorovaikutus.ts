import { VuorovaikutusTilaisuusTyyppi, IlmoitettavaViranomainen } from "@services/api";
import { isValidDate } from "src/util/dateUtils";
import * as Yup from "yup";
import { yhteystietoSchema } from "./yhteystieto";
import filter from "lodash/filter";

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
      esitettavatYhteystiedot: Yup.array().when("tyyppi", {
        is: VuorovaikutusTilaisuusTyyppi.SOITTOAIKA,
        then: Yup.array().of(yhteystietoSchema),
      }),
      projektiYhteysHenkilot: Yup.array()
        .when("tyyppi", {
          is: VuorovaikutusTilaisuusTyyppi.SOITTOAIKA,
          then: Yup.array().of(Yup.string()).required("Vähintään yksi yhteyshenkilö pitää valita"),
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
      videot: Yup.array().notRequired().of(Yup.object().shape({
        nimi: Yup.string(),
        url: Yup.string().url("URL ei kelpaa").notRequired()
      })).compact(function (linkki) {
        return !linkki.url;
      }),
      suunnittelumateriaali: Yup.object().notRequired().shape({
        nimi: Yup.string().required("Anna nimi"),
        url: Yup.string().url("URL ei kelpaa").required("Anna osoite")
      }),
      ilmoituksenVastaanottajat: Yup.object()
      .shape({
        kunnat: Yup.array()
          .of(
            Yup.object()
              .shape({
                nimi: Yup.string().required(),
                sahkoposti: Yup.string()
                  .email("Virheellinen sähköpostiosoite")
                  .required("Sähköpostiosoite on pakollinen"),
              })
              .required()
          )
          .compact(function (kunta) {
            return !kunta.nimi && !kunta.sahkoposti;
          })
          .notRequired(),
        viranomaiset: Yup.array()
          .of(
            Yup.object()
              .shape({
                nimi: Yup.mixed().oneOf(Object.values(IlmoitettavaViranomainen), "Viranomaistieto on pakollinen"),
                sahkoposti: Yup.string()
                  .email("Virheellinen sähköpostiosoite")
                  .required("Sähköpostiosoite on pakollinen"),
              })
              .test("unique", "Vastaanottaja on jo lisätty", (value, testContext) => {
                const duplikaatit = filter(testContext.parent, value);
                if (duplikaatit.length == 1) {
                  return true;
                }
                return testContext.createError({
                  path: `${testContext.path}.nimi`,
                  message: "Viranomainen on jo valittu",
                });
              })
              .required()
          )
          .compact(function (viranomainen) {
            return !viranomainen.nimi && !viranomainen.sahkoposti;
          })
          .notRequired(),
      })
      .required(),
    }),
  }),
});
