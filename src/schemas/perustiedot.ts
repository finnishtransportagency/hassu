import * as Yup from "yup";
import { puhelinNumeroSchema } from "./puhelinNumero";

export const maxNoteLength = 2000;

export const perustiedotValidationSchema = Yup.object().shape({
  oid: Yup.string().required(),
  lisakuulutuskieli: Yup.string()
    .notRequired()
    .nullable()
    .test("not-null-when-lisakuulutus-selected-test", "Valitse lisäkuulutuskieli", function (kieli) {
      // if lisakuulutuskieli checkbox checked, select one language option
      if (this.options?.context?.requireLisakuulutuskieli) {
        return !!kieli;
      }
      return true;
    })
    .default(null),
  liittyvatSuunnitelmat: Yup.array()
    .of(
      Yup.object().shape({
        asiatunnus: Yup.string().required("Asiatunnus puuttuu"),
        nimi: Yup.string().required("Suunnitelman nimi puuttuu"),
      })
    )
    .notRequired()
    .nullable()
    .default(null),
  euRahoitus: Yup.boolean().nullable().required("EU-rahoitustieto on pakollinen"),
  muistiinpano: Yup.string().max(
    maxNoteLength,
    `Muistiinpanoon voidaan kirjoittaa maksimissaan ${maxNoteLength} merkkiä.`
  ),
  suunnitteluSopimus: Yup.object()
    .shape({
      kunta: Yup.string().required("Kunta on pakollinen"),
      etunimi: Yup.string().required("Etunimi on pakollinen"),
      sukunimi: Yup.string().required("Sukunimi on pakollinen"),
      puhelinnumero: puhelinNumeroSchema,
      email: Yup.string().email("Virheellinen sähköpostiosoite").required("Sähköpostiosoite on pakollinen"),
      logo: Yup.mixed().required("Logo on pakollinen."),
    })
    .notRequired()
    .nullable()
    .default(null),
});
