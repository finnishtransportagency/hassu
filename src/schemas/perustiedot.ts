import * as Yup from "yup";
import getAsiatunnus from "../util/getAsiatunnus";

export const maxNoteLength = 2000;

export const UIValuesSchema = Yup.object().shape({
  suunnittelusopimusprojekti: Yup.string().required("Suunnittelusopimustieto on pakollinen").nullable().default(null),
  liittyviasuunnitelmia: Yup.string().required("Liittyvien suunnitelmien tieto on pakollinen").nullable().default(null),
  eurahoitusprojekti: Yup.string().required("EU-rahoitustieto on pakollinen").nullable().default(null),
});

export const perustiedotValidationSchema = Yup.object()
  .shape({
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
    euRahoitusLogot: Yup.object()
      .shape({
        logoFI: Yup.mixed().required("EU-logo FI on pakollinen"),
        logoSV: Yup.mixed().required("EU-logo SV on pakollinen"),
      })
      .notRequired()
      .nullable()
      .default(null),
    vahainenMenettely: Yup.boolean().nullable().optional(),
    muistiinpano: Yup.string().max(maxNoteLength, `Muistiinpanoon voidaan kirjoittaa maksimissaan ${maxNoteLength} merkkiä.`),
    suunnitteluSopimus: Yup.object()
      .shape({
        kunta: Yup.string().required("Kunta on pakollinen"),
        yhteysHenkilo: Yup.string().required("Yhteyshenkilö on pakollinen").min(1),
        logo: Yup.mixed().required("Logo on pakollinen."),
      })
      .notRequired()
      .nullable()
      .default(null),
  })
  .test("asiatunnus-maaritetty", "Projektille ei ole asetettu asiatunnusta", (_projekti, context) => {
    const projekti = context.options.context?.projekti;
    return !!getAsiatunnus(projekti);
  });
