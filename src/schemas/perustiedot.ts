import * as Yup from "yup";
import { puhelinNumeroSchema } from "./puhelinNumero";

export const maxNoteLength = 2000;
const asiatunnusRegex = /Väylä\/[0-9]{4,5}\/([0-9]{2}(\.[0-9]{2}){2})\/[0-9]{4}/g;

export const UIValuesSchema = Yup.object().shape({
  suunnittelusopimusprojekti: Yup.string().required("Suunnittelusopimustieto on pakollinen").nullable().default(null),
  liittyviasuunnitelmia: Yup.string().required("Liittyvien suunnitelmien tieto on pakollinen").nullable().default(null),
  liittyvatSuunnitelmat: Yup.array().of(Yup.object().shape({
    asiatunnus: Yup.string().matches(asiatunnusRegex, "Asiatunnus ei ole oikeaa muotoa, esim: Väylä/4825/06.02.03/2020"),
  }))
});

export const perustiedotValidationSchema = Yup.object().shape({
  oid: Yup.string().required(),
  kielitiedot: Yup.object()
    .shape({
      ensisijainenKieli: Yup.string().required("Ensisijainen kieli puuttuu"),
      toissijainenKieli: Yup.string().notRequired().nullable().default(null),
      projektinNimiVieraskielella: Yup.string().notRequired().nullable().default(null),
    })
    .notRequired()
    .nullable()
    .default(null),
  liittyvatSuunnitelmat: Yup.array()
    .of(
      Yup.object().shape({
        asiatunnus: Yup.string().max(30).required("Asiatunnus puuttuu"),
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
