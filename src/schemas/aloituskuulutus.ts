import { IlmoitettavaViranomainen, Projekti } from "@services/api";
import * as Yup from "yup";
import { kayttoOikeudetSchema } from "./kayttoOikeudet";
import { puhelinNumeroSchema } from "./puhelinNumero";
import { isDevEnvironment } from "@services/config";
import filter from "lodash/filter";

const maxAloituskuulutusLength = 2000;

let hankkeenKuvaus = Yup.string()
  .max(
    maxAloituskuulutusLength,
    `Aloituskuulutukseen voidaan kirjoittaa maksimissaan ${maxAloituskuulutusLength} merkkiä`
  )
  .required("Hankkeen kuvaus ei voi olla tyhjä")
  .nullable();

function validateDate(dateString: string) {
  try {
    const dateString2 = new Date(dateString!).toISOString().split("T")[0];
    if (isDevEnvironment) {
      return dateString!.startsWith(dateString2);
    }
    return dateString2 === dateString;
  } catch {
    return false;
  }
}

export const aloituskuulutusSchema = Yup.object().shape({
  oid: Yup.string().required(),
  kayttoOikeudet: kayttoOikeudetSchema,
  aloitusKuulutus: Yup.object().shape({
    hankkeenKuvaus: Yup.object().shape({ SUOMI: hankkeenKuvaus }),
    kuulutusPaiva: Yup.string()
      .required("Kuulutuspäivä ei voi olla tyhjä")
      .nullable()
      .test("is-valid-date", "Virheellinen päivämäärä", (dateString) => {
        if (!dateString) {
          return false;
        }
        return validateDate(dateString);
      })
      .test("not-in-past", "Kuulutuspäivää ei voida asettaa menneisyyteen", (dateString) => {
        // KuulutusPaiva is not required when saved as a draft.
        // This test doesn't throw errors if date is not set.
        if (!dateString) {
          return true;
        }
        const todayISODate = new Date().toISOString().split("T")[0];
        return dateString >= todayISODate;
      }),
    siirtyySuunnitteluVaiheeseen: Yup.string().test("is-valid-date", "Virheellinen päivämäärä", (dateString) => {
      // KuulutusPaiva is not required when saved as a draft.
      // This test doesn't throw errors if date is not set.
      if (!dateString) {
        return true;
      }
      return validateDate(dateString);
    }),
    esitettavatYhteystiedot: Yup.array()
      .notRequired()
      .of(
        Yup.object()
          .shape({
            etunimi: Yup.string().required("Etunimi on pakollinen"),
            sukunimi: Yup.string().required("Sukunimi on pakollinen"),
            puhelinnumero: puhelinNumeroSchema.test(
              "puhelinnumero-not-in-kayttoOikeudet",
              "Tieto löytyy projektin henkilöistä. Valitse henkilö projektiin tallennettujen listasta",
              function (puhelinnumero) {
                const projekti = this.options.context as Projekti;
                return !projekti?.kayttoOikeudet?.some(
                  (kayttaja) => kayttaja.puhelinnumero && kayttaja.puhelinnumero === puhelinnumero
                );
              }
            ),
            sahkoposti: Yup.string()
              .required("Sähköpostiosoite on pakollinen")
              .email("Virheellinen sähköpostiosoite")
              .test(
                "sahkoposti-not-in-kayttoOikeudet",
                "Tieto löytyy projektin henkilöistä. Valitse henkilö projektiin tallennettujen listasta",
                function (sahkoposti) {
                  const projekti = this.options.context as Projekti;
                  return !projekti?.kayttoOikeudet?.some((kayttaja) => kayttaja.email && kayttaja.email === sahkoposti);
                }
              ),
            organisaatio: Yup.string().required("Organisaatio on pakollinen"),
            id: Yup.string().nullable().notRequired(),
          })
          .nullable()
      ),
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
          .notRequired(),
      })
      .required(),
  }),
});
