import * as Yup from "yup";
import getAsiatunnus from "../util/getAsiatunnus";
import { Kieli } from "../../common/graphql/apiModel";
import { MutableRefObject } from "react";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";

export const maxNoteLength = 2000;

export const UIValuesSchema = Yup.object().shape({
  suunnittelusopimusprojekti: Yup.string().required("Suunnittelusopimustieto on pakollinen").nullable().default(null),
  liittyviasuunnitelmia: Yup.string().required("Liittyvien suunnitelmien tieto on pakollinen").nullable().default(null),
});

export const perustiedotValidationSchema = Yup.object()
  .shape({
    oid: Yup.string().required(),
    kielitiedot: Yup.object()
      .shape({
        ensisijainenKieli: Yup.string().required("Ensisijainen kieli puuttuu"),
        toissijainenKieli: Yup.string().notRequired().nullable().default(null),
        projektinNimiVieraskielella: Yup.string()
          .nullable()
          .default(null)
          .when("ensisijainenKieli", {
            is: (value: Kieli) => [Kieli.RUOTSI, Kieli.POHJOISSAAME].includes(value),
            then: (schema) => schema.required("Projektin nimi on pakollinen"),
          })
          .when("toissijainenKieli", {
            is: (value: Kieli) => [Kieli.RUOTSI, Kieli.POHJOISSAAME].includes(value),
            then: (schema) => schema.required("Projektin nimi on pakollinen"),
          }),
      })
      .required()
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
        SUOMI: Yup.mixed().when("$hasEuRahoitus", {
          is: (hasEuRahoitus: MutableRefObject<boolean>) => hasEuRahoitus.current,
          then: (schema) => schema.required("Suomenkielinen EU-logo on pakollinen"),
        }),
        RUOTSI: Yup.mixed().when(["$isRuotsinkielinenProjekti", "$hasEuRahoitus"], {
          is: (isRuotsinkielinenProjekti: MutableRefObject<boolean>, hasEuRahoitus: MutableRefObject<boolean>) =>
            isRuotsinkielinenProjekti.current && hasEuRahoitus.current,
          then: (schema) => schema.required("Ruotsinkielinen EU-logo on pakollinen, kun ruotsi on valittu projektin kuulutusten kieleksi"),
        }),
      })
      .notRequired()
      .nullable()
      .default(null),
    vahainenMenettely: Yup.boolean().nullable().optional(),
    muistiinpano: Yup.string().max(maxNoteLength, `Muistiinpanoon voidaan kirjoittaa maksimissaan ${maxNoteLength} merkkiä.`),
    suunnitteluSopimus: Yup.object()
      .shape({
        kunta: Yup.string().required("Kunta on pakollinen"),
        yhteysHenkilo: Yup.string().required("Yhteyshenkilö on pakollinen").min(1).nullable(),
        logo: Yup.object()
          .shape({
            SUOMI: Yup.mixed().required("Suomenkielinen kunnan logo on pakollinen."),
            RUOTSI: Yup.mixed().when("$isRuotsinkielinenProjekti", {
              is: (isRuotsinkielinenProjekti: MutableRefObject<boolean>) => isRuotsinkielinenProjekti.current,
              then: (schema) =>
                schema.required("Ruotsinkielinen kunnan logo on pakollinen, kun ruotsi on valittu projektin kuulutusten kieleksi."),
            }),
          })
          .notRequired()
          .nullable()
          .default(null),
      })
      .test(
        "vahainen-menettely-ei-voi-olla-samaan-aikaan",
        "Projektilla, jossa sovelletaan vähäistä menettelyä, ei voi olla suunnittelusopimusta",
        (suunnitteluSopimus, context) => {
          const vahainenMenettely = context.parent.vahainenMenettely;
          return !(vahainenMenettely && suunnitteluSopimus);
        }
      )
      .notRequired()
      .nullable()
      .default(null),
    asianhallintaIntegraatio: Yup.boolean().when("$projekti", {
      is: (projekti: ProjektiLisatiedolla) => projekti.asianhallinta.aktivoitavissa,
      then: (schema) => schema.required("Asianhallinta integraatiotieto on pakollinen"),
    }),
  })
  .test("asiatunnus-maaritetty", "Projektille ei ole asetettu asiatunnusta", (_projekti, context) => {
    const projekti = context.options.context?.projekti;
    return !!getAsiatunnus(projekti);
  });
