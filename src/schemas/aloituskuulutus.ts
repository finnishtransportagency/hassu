import { Projekti } from "@services/api";
import * as Yup from "yup";
import { kayttoOikeudetSchema } from "./kayttoOikeudet";
import { puhelinNumeroSchema } from "./puhelinNumero";

const maxAloituskuulutusLength = 2000;

export const aloituskuulutusSchema = Yup.object().shape({
  oid: Yup.string().required(),
  kayttoOikeudet: kayttoOikeudetSchema,
  aloitusKuulutus: Yup.object().shape({
    hankkeenKuvaus: Yup.string()
      .max(
        maxAloituskuulutusLength,
        `Aloituskuulutukseen voidaan kirjoittaa maksimissaan ${maxAloituskuulutusLength} merkkiä`
      )
      .required("Hankkeen kuvaus ei voi olla tyhjä")
      .nullable(),
    kuulutusPaiva: Yup.string()
      .required("Kuulutuspäivä ei voi olla tyhjä")
      .nullable()
      .test("is-valid-date", "Virheellinen päivämäärä", (dateString) => {
        let validDate = false;
        try {
          const dateString2 = new Date(dateString!).toISOString().split("T")[0];
          if (dateString2 === dateString) {
            validDate = true;
          }
        } catch {
          validDate = false;
        }
        return validDate;
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
      let validDate = false;
      try {
        const dateString2 = new Date(dateString!).toISOString().split("T")[0];
        if (dateString2 === dateString) {
          validDate = true;
        }
      } catch {
        validDate = false;
      }
      return validDate;
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
  }),
});
