import { VuorovaikutusTilaisuusTyyppi } from "@services/api";
import * as Yup from "yup";
import { ilmoituksenVastaanottajat, standardiYhteystiedot } from "./common";
import { lokalisoituTeksti, lokalisoituTekstiEiPakollinen } from "./lokalisoituTeksti";
import { paivamaara } from "./paivamaaraSchema";
import { kutsuSaamePDFInput } from "./kutsuSaamePDFInput";

const validTimeRegexp = /^([0-1]?[0-9]|2[0-4]):([0-5]?[0-9])$/;

export const palauteSchema = Yup.object().shape({
  etunimi: Yup.string().notRequired().max(100, "etunimi_max_100").nullable(),
  sukunimi: Yup.string().notRequired().max(100, "sukunimi_max_100").nullable(),
  sahkoposti: Yup.string()
    .notRequired()
    .email("sahkoposti_ei_kelpaa")
    .nullable()
    .test({
      message: "sahkoposti_pakollinen_jos",
      test: (sahkoposti, context) => {
        if (context.parent.yhteydenottotapaEmail === true && !sahkoposti) {
          return false;
        }
        return true;
      },
    }),
  puhelinnumero: Yup.string()
    .notRequired()
    .max(20, "puh_max_20")
    .nullable()
    .test({
      message: "puhelinnumero_pakollinen_jos",
      test: (puhelinnumero, context) => {
        if (context.parent.yhteydenottotapaPuhelin === true && !puhelinnumero) {
          return false;
        }
        return true;
      },
    }),
  kysymysTaiPalaute: Yup.string().required("palaute_on_jatettava").max(2000),
  yhteydenottotapaEmail: Yup.boolean().notRequired().nullable(),
  yhteydenottotapaPuhelin: Yup.boolean().notRequired().nullable(),
  liite: Yup.string()
    .notRequired()
    .nullable()
    .test({
      message: "vain_kuva_tai_pdf",
      test: (file, context) => {
        const isValid = !file || /.*\.[(jpg)|(jpeg)|(png)|(pdf)]/.test(file.toLowerCase());
        if (!isValid) context?.createError();
        return isValid;
      },
    }),
});

export const vuorovaikutustilaisuudetSchema = Yup.object().shape({
  vuorovaikutusTilaisuudet: Yup.array().of(
    Yup.object().shape({
      tyyppi: Yup.mixed<VuorovaikutusTilaisuusTyyppi>().oneOf(Object.values(VuorovaikutusTilaisuusTyyppi)).required(),
      nimi: lokalisoituTekstiEiPakollinen({
        additionalStringValidations: (schema) => schema.max(100, `Nimi voi olla maksimissaan 100 merkkiä`),
      }).nullable(),
      paivamaara: paivamaara({ preventPast: true }).required("Vuorovaikutustilaisuuden päivämäärä täytyy antaa"),
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
      paikka: Yup.object()
        .when("tyyppi", {
          is: VuorovaikutusTilaisuusTyyppi.PAIKALLA,
          then: lokalisoituTekstiEiPakollinen({
            additionalStringValidations: (schema) => schema.max(100, `Paikka voi olla maksimissaan 100 merkkiä`),
          }),
        })
        .nullable(),
      osoite: Yup.object()
        .when("tyyppi", {
          is: VuorovaikutusTilaisuusTyyppi.PAIKALLA,
          then: lokalisoituTeksti({
            requiredText: "Tilaisuuden osoite täytyy antaa",
            additionalStringValidations: (schema) => schema.max(100, `Osoite voi olla maksimissaan 100 merkkiä`),
          }),
        })
        .nullable(),
      postinumero: Yup.string()
        .when("tyyppi", {
          is: VuorovaikutusTilaisuusTyyppi.PAIKALLA,
          then: Yup.string().max(5, "Postinumero voi olla maksimissaan 5 merkkiä").required("Postinumero on pakollinen tieto").nullable(),
        })
        .nullable(),
      postitoimipaikka: Yup.object()
        .when("tyyppi", {
          is: VuorovaikutusTilaisuusTyyppi.PAIKALLA,
          then: lokalisoituTekstiEiPakollinen({
            additionalStringValidations: (schema) => schema.max(100, `Postitoimipaikka voi olla maksimissaan 50 merkkiä`),
          }),
        })
        .nullable(),
      lisatiedot: lokalisoituTekstiEiPakollinen({
        additionalStringValidations: (schema) => schema.max(200, `Lisätiedot voivat olla maksimissaan 200 merkkiä`),
      }).nullable(),
      esitettavatYhteystiedot: Yup.object()
        .nullable()
        .when("tyyppi", {
          is: VuorovaikutusTilaisuusTyyppi.SOITTOAIKA,
          then: standardiYhteystiedot().test("at-least-one-contact", "Vähintään yksi yhteyshenkilö on annettava", (objekti) => {
            if ((objekti.yhteysHenkilot?.length || 0) + (objekti.yhteysTiedot?.length || 0) === 0) {
              return false;
            }
            return true;
          }),
        }),
    })
  ),
});

export const vuorovaikutustilaisuusPaivitysSchema = Yup.object().shape({
  vuorovaikutusTilaisuudet: Yup.array().of(
    Yup.object().shape({
      nimi: lokalisoituTekstiEiPakollinen({
        additionalStringValidations: (schema) => schema.max(100, `Nimi voi olla maksimissaan 100 merkkiä`),
      }).nullable(),
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
      esitettavatYhteystiedot: Yup.object()
        .nullable()
        .when("tyyppi", {
          is: VuorovaikutusTilaisuusTyyppi.SOITTOAIKA,
          then: standardiYhteystiedot().test("at-least-one-contact", "Vähintään yksi yhteyshenkilö on annettava", (objekti) => {
            if ((objekti.yhteysHenkilot?.length || 0) + (objekti.yhteysTiedot?.length || 0) === 0) {
              return false;
            }
            return true;
          }),
        }),
      lisatiedot: lokalisoituTekstiEiPakollinen({
        additionalStringValidations: (schema) => schema.max(200, `Lisätiedot voivat olla maksimissaan 200 merkkiä`),
      }).nullable(),
    })
  ),
});

export const maxHankkeenkuvausLength = 2000;

export const vuorovaikutusSchema = Yup.object().shape({
  oid: Yup.string().required(),
  vuorovaikutusKierros: Yup.object().shape({
    vuorovaikutusNumero: Yup.number().required(),
    hankkeenKuvaus: lokalisoituTeksti({
      requiredText: "Hankkeen kuvaus ei voi olla tyhjä",
      additionalStringValidations: (schema) =>
        schema
          .max(maxHankkeenkuvausLength, `Hankkeen kuvaukseen voidaan kirjoittaa maksimissaan ${maxHankkeenkuvausLength} merkkiä`)
          .min(1, `Hankkeen kuvaukseen ei voi olla tyhjä`),
    }),
    vuorovaikutusJulkaisuPaiva: paivamaara({ preventPast: true }).required("Julkaisupäivä täytyy antaa"),
    esitettavatYhteystiedot: standardiYhteystiedot(),
    vuorovaikutusTilaisuudet: Yup.array()
      .of(vuorovaikutustilaisuudetSchema)
      .required("Vähintään yksi tilaisuus täytyy antaa")
      .min(1, "Vähintään yksi tilaisuus täytyy antaa")
      .nullable(),
    ilmoituksenVastaanottajat: ilmoituksenVastaanottajat(),
    vuorovaikutusSaamePDFt: kutsuSaamePDFInput(),
  }),
});
