import * as Yup from "yup";
import { Projekti } from "../graphql/apiModel";
import { puhelinNumeroSchema } from "./puhelinNumero";

export const yhteystietoSchema = Yup.object()
  .shape({
    etunimi: Yup.string().required("Etunimi on pakollinen"),
    sukunimi: Yup.string().required("Sukunimi on pakollinen"),
    puhelinnumero: puhelinNumeroSchema.test(
      "puhelinnumero-not-in-kayttoOikeudet",
      "Tieto löytyy projektin henkilöistä. Valitse henkilö projektiin tallennettujen listasta",
      function (puhelinnumero) {
        const projekti = (this.options.context as any).projekti as Projekti;
        return !projekti?.kayttoOikeudet?.some((kayttaja) => kayttaja.puhelinnumero && kayttaja.puhelinnumero === puhelinnumero);
      }
    ),
    sahkoposti: Yup.string()
      .required("Sähköpostiosoite on pakollinen")
      .email("Virheellinen sähköpostiosoite")
      .test(
        "sahkoposti-not-in-kayttoOikeudet",
        "Tieto löytyy projektin henkilöistä. Valitse henkilö projektiin tallennettujen listasta",
        function (sahkoposti) {
          const projekti = (this.options.context as any).projekti as Projekti;
          return !projekti?.kayttoOikeudet?.some((kayttaja) => kayttaja.email && kayttaja.email === sahkoposti);
        }
      ),
    organisaatio: Yup.string().required("Organisaatio on pakollinen"),
    id: Yup.string().nullable().notRequired(),
  })
  .nullable();
