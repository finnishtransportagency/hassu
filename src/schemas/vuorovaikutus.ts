import { VuorovaikutusTilaisuusTyyppi, IlmoitettavaViranomainen } from "@services/api";
import { isValidDate } from "src/util/dateUtils";
import * as Yup from "yup";
import { yhteystietoSchema } from "./yhteystieto";
import filter from "lodash/filter";


const validTimeRegexp = /^([0-1]?[0-9]|2[0-4]):([0-5]?[0-9])$/;

export const palauteSchema = Yup.object().shape({
  etunimi: Yup.string().notRequired().max(100).nullable(),
  sukunimi: Yup.string().notRequired().max(100).nullable(),
  sahkoposti: Yup.string().notRequired().email("sahkoposti_ei_kelpaa").nullable(),
  puhelinnumero: Yup.string().notRequired().max(20).nullable(),
  kysymysTaiPalaute: Yup.string().required("palaute_on_jatettava").max(2000),
  yhteydenottotapaEmail: Yup.boolean().notRequired().nullable(),
  yhteydenottotapaPuhelin: Yup.boolean().notRequired().nullable(),
  liite: Yup.string().notRequired().nullable()
    .test({
      message: 'vain_kuva_tai_pdf',
      test: (file, context) => {
        const isValid = !file || /.*\.[(jpg)|(jpeg)|(png)|(pdf)]/.test(file);
        if (!isValid) context?.createError();
        return isValid;
      }
    })
});

export const vuorovaikutustilaisuudetSchema = Yup.object().shape({
  vuorovaikutusTilaisuudet: Yup.array().of(
    Yup.object().shape({
      tyyppi: Yup.mixed<VuorovaikutusTilaisuusTyyppi>()
        .oneOf(Object.values(VuorovaikutusTilaisuusTyyppi))
        .required(),
      nimi: Yup.string().nullable(),
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
      esitettavatYhteystiedot: Yup.array()
        .when("tyyppi", {
          is: VuorovaikutusTilaisuusTyyppi.SOITTOAIKA,
          then: Yup.array().of(yhteystietoSchema),
        })
        .nullable(),
      projektiYhteysHenkilot: Yup.array()
        .when("tyyppi", {
          is: VuorovaikutusTilaisuusTyyppi.SOITTOAIKA,
          then: Yup.array()
            .of(Yup.string())
            .required("Vähintään yksi yhteyshenkilö pitää valita")
            .min(1, "Vähintään yksi yhteyshenkilö pitää valita")
            .nullable(),
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
      vuorovaikutusTilaisuudet: Yup.array()
        .of(vuorovaikutustilaisuudetSchema)
        .required("Vähintään yksi tilaisuus täytyy antaa")
        .min(1, "Vähintään yksi tilaisuus täytyy antaa")
        .nullable(),
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
          nimi: Yup.string().test("nimi-puttuu", "Nimi puuttuu", (value, testContext) => {
            if (!value && testContext.parent.url) {
              return testContext.createError({
                path: `${testContext.path}`,
                message: "Nimi on annettava, jos osoite on annettu",
              });
            }
            return true;
          }),
          url: Yup.string()
            .url("URL ei kelpaa")
            .test("url-puttuu", "Url puuttuu", (value, testContext) => {
              if (!value && testContext.parent.nimi) {
                return testContext.createError({
                  path: `${testContext.path}`,
                  message: "Osoite on annettava, jos nimi on annettu",
                });
              }
              return true;
            }),
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
