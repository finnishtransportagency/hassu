import * as Yup from "yup";
import getAsiatunnus from "../util/getAsiatunnus";
import { Kieli } from "../../common/graphql/apiModel";
import { MutableRefObject } from "react";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";

export const maxNoteLength = 2000;

export const UIValuesSchema = Yup.object().shape({
  suunnittelusopimusprojekti: Yup.string().required("Suunnittelusopimustieto on pakollinen").nullable().default(null),
  kustannuspaikka: Yup.string()
    .matches(/^[A-Z0-9]{1,15}$/, { message: "Max 15 merkkiä, vain isoja kirjaimia ja numeroita." })
    .default("")
    .typeError("Max 15 merkkiä, vain isoja kirjaimia ja numeroita."),
});

const makeMaybeOsapuoliSchema = (): Yup.AnySchema => {
  return Yup.object()
    .notRequired()
    .default(undefined)
    .transform((value: any, originalValue: Record<string, any> | null | undefined) => {
      if (originalValue == null || (typeof originalValue === "object" && Object.keys(originalValue).length === 0)) {
        return undefined;
      }
      return value;
    })
    .shape({
      osapuolenNimiFI: Yup.string().required("Kunnan nimi suomeksi on pakollinen"),
      osapuolenNimiSV: Yup.string().when("$isRuotsinkielinenProjekti", {
        is: (isRuotsinkielinenProjekti: any) => {
          return isRuotsinkielinenProjekti?.current === true;
        },
        then: (schema) => schema.required("Kunnan nimi ruotsiksi on pakollinen"),
        otherwise: (schema) => schema.notRequired(),
      }),
      osapuolenLogo: Yup.object()
        .shape({
          SUOMI: Yup.mixed().required("Suomenkielinen logo on pakollinen"),
          RUOTSI: Yup.mixed().when("$isRuotsinkielinenProjekti", {
            is: (isRuotsinkielinenProjekti: any) => {
              return isRuotsinkielinenProjekti?.current === true;
            },
            then: (schema) => schema.required("Ruotsinkielinen logo on pakollinen"),
            otherwise: (schema) => schema.notRequired(),
          }),
        })
        .nullable(),
      osapuolenHenkilot: Yup.array()
        .of(Yup.object().shape({}))
        .min(1, "Ainakin yksi edustaja vaaditaan")
        .max(2, "Enintään kaksi edustajaa sallitaan")
        .required("Edustaja on pakollinen")
        .test("atleast-one-selected", "Vähintään yksi henkilö on valittava", (value) => {
          if (!value || !Array.isArray(value)) {
            return true;
          }
          const henkilot = value as any[];

          if (henkilot.length === 0) {
            return true;
          }

          return henkilot.some((henkilo) => henkilo?.valittu === true);
        }),
    });
};

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
        osapuoli1: makeMaybeOsapuoliSchema(),
        osapuoli2: makeMaybeOsapuoliSchema(),
        osapuoli3: makeMaybeOsapuoliSchema(),
        yhteysHenkilo: Yup.string().optional().nullable(),
        kunta: Yup.string()
          .nullable()
          .when("yhteysHenkilo", {
            is: (val: unknown) => typeof val === "string" && val.trim() !== "",
            then: (schema) => schema.required("Kunta on pakollinen"),
            otherwise: (schema) => schema.notRequired(),
          }),
        logo: Yup.object()
          .nullable()
          .when("yhteysHenkilo", {
            is: (val: unknown) => typeof val === "string" && val.trim() !== "",
            then: (schema) => schema.required("Suomenkielinen kunnan logo on pakollinen."),
            otherwise: (schema) => schema.notRequired(),
          }),
      })
      .test(
        "vahainen-menettely-ei-voi-olla-samaan-aikaan",
        "Projektilla, jossa sovelletaan vähäistä menettelyä, ei voi olla suunnittelusopimusta",
        (suunnitteluSopimus: any, context: { parent: { vahainenMenettely: any } }) => {
          const vahainenMenettely = context.parent.vahainenMenettely;
          return !(vahainenMenettely && suunnitteluSopimus);
        }
      )
      .notRequired()
      .nullable()
      .default(null),
    asianhallinta: Yup.object()
      .shape({
        inaktiivinen: Yup.boolean().required("Asianhallinta integraatiotieto on pakollinen"),
      })
      .when("$projekti", {
        is: (projekti: Pick<ProjektiLisatiedolla, "asianhallinta">) => !!projekti?.asianhallinta?.aktivoitavissa,
        then: (schema) => schema.required("Asianhallinta integraatiotieto on pakollinen"),
      })
      .default(undefined),
  })
  .test("asiatunnus-maaritetty", "Projektille ei ole asetettu asiatunnusta", (_projekti, context) => {
    const projekti = context.options.context?.projekti;
    return !!getAsiatunnus(projekti);
  });
