import * as Yup from "yup";
import { paivamaara } from "hassu-common/schema/paivamaaraSchema";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import { KasittelynTila } from "@services/api";

type Hyvaksymispaatos = keyof Pick<KasittelynTila, "hyvaksymispaatos" | "ensimmainenJatkopaatos" | "toinenJatkopaatos">;

export const hyvaksymispaatosSchema = (paatosAvain: Hyvaksymispaatos) =>
  Yup.object()
    .shape({
      paatoksenPvm: paivamaara().when("$projekti", {
        is: (projekti: ProjektiLisatiedolla) =>
          projekti.kasittelynTila?.[paatosAvain]?.aktiivinen &&
          projekti.kasittelynTila?.[paatosAvain]?.asianumero &&
          projekti.kasittelynTila?.[paatosAvain]?.paatoksenPvm,
        then: (schema) => schema.required("Päivämäärä on annettava"),
      }),
      asianumero: Yup.string()
        .max(100, "Asiatunnus voi olla maksimissaan 100 merkkiä pitkä")
        .when("$projekti", {
          is: (projekti: ProjektiLisatiedolla) =>
            projekti.kasittelynTila?.[paatosAvain]?.aktiivinen &&
            projekti.kasittelynTila?.[paatosAvain]?.asianumero &&
            projekti.kasittelynTila?.[paatosAvain]?.paatoksenPvm,
          then: (schema) => schema.required("Asiatunnus on annettava"),
        })
        .notRequired()
        .nullable(),
    })
    .test((value, context) => {
      if (!!value?.asianumero && !value?.paatoksenPvm) {
        return context.createError({
          message: "Päivämäärä on annettava jos asiatunnus on annettu",
          path: `${context.path}.paatoksenPvm`,
          type: "custom",
        });
      }
      if (!value?.asianumero && !!value?.paatoksenPvm) {
        return context.createError({
          message: "Asiatunnus on annettava jos päivämäärä on annettu",
          path: `${context.path}.asianumero`,
          type: "custom",
        });
      }
      return true;
    })
    .notRequired()
    .nullable()
    .default(undefined);

const paatosSchema = () =>
  Yup.object().shape({
    paiva: paivamaara().nullable(),
    sisalto: Yup.string().max(2000, "Sisältö voi olla maksimissaan 2000 merkkiä.").nullable(),
  });

const oikeusSchema = () =>
  Yup.object()
    .shape({
      valipaatos: paatosSchema().nullable(),
      paatos: paatosSchema().nullable(),
      hyvaksymisPaatosKumottu: Yup.boolean().test((value, context) => {
        const valueNotGivenButSomeOtherIs =
          (value === null || value === undefined) &&
          (context.parent.valipaatos?.paiva ||
            context.parent.paatos?.paiva ||
            context.parent.valipaatos?.sisalto ||
            context.parent.paatos?.sisalto);
        if (valueNotGivenButSomeOtherIs) {
          return context.createError({
            message: `Tieto on annettava`,
            path: `${context.path}`,
            type: "custom",
          });
        }
        return true;
      }),
    })
    .notRequired()
    .default(undefined);
export const kasittelynTilaSchema = Yup.object().shape({
  kasittelynTila: Yup.object().shape({
    hyvaksymispaatos: hyvaksymispaatosSchema("hyvaksymispaatos"),
    ensimmainenJatkopaatos: hyvaksymispaatosSchema("ensimmainenJatkopaatos"),
    toinenJatkopaatos: hyvaksymispaatosSchema("toinenJatkopaatos"),
    suunnitelmanTila: Yup.string(),
    hyvaksymisesitysTraficomiinPaiva: paivamaara().notRequired().nullable(),
    ennakkoneuvotteluPaiva: paivamaara().notRequired().nullable(),
    valitustenMaara: Yup.string().min(1, "Valitusten lukumäärä on pakollinen").nullable(),
    lainvoimaAlkaen: paivamaara().notRequired().nullable(),
    lainvoimaPaattyen: paivamaara()
      .notRequired()
      .nullable()
      .test((value, context) => {
        if (value) {
          if (!context.parent.lainvoimaAlkaen) {
            return context.createError({
              message: "Lainvoima alkaen on annettava.",
              path: `${context.path}`,
              type: "custom",
            });
          }
        }
        return true;
      }),
    ennakkotarkastus: paivamaara()
      .notRequired()
      .nullable()
      .test((value, context) => {
        if (value) {
          if (!context.parent.hyvaksymisesitysTraficomiinPaiva) {
            return context.createError({
              message: "Hyväksymisesitys Traficomiin on annettava.",
              path: `${context.path}`,
              type: "custom",
            });
          }
        }
        return true;
      }),
    toimitusKaynnistynyt: paivamaara().notRequired().nullable(),
    liikenteeseenluovutusOsittain: paivamaara().notRequired().nullable(),
    liikenteeseenluovutusKokonaan: paivamaara().notRequired().nullable(),
    toteutusilmoitusOsittain: paivamaara().notRequired().nullable(),
    toteutusilmoitusKokonaan: paivamaara().notRequired().nullable(),
    lisatieto: Yup.string().max(2000, "Lisätieto voi olla maksimissaan 2000 merkkiä pitkä").notRequired().nullable(),
    hallintoOikeus: oikeusSchema().test((value: any, context: any) => {
      const khoPaatosGiven =
        context.parent.korkeinHallintoOikeus?.hyvaksymisPaatosKumottu === true ||
        context.parent.korkeinHallintoOikeus?.hyvaksymisPaatosKumottu === false;
      const valueIsGivenButHallintoOikeusValuesIsNot =
        !(value?.hyvaksymisPaatosKumottu === true || value?.hyvaksymisPaatosKumottu === false) && khoPaatosGiven;
      if (valueIsGivenButHallintoOikeusValuesIsNot) {
        return context.createError({
          message: `Hallinto-oikeuden päätös on annettava ennen KHO:n päätöstä.`,
          path: `${context.path}`,
          type: "custom",
        });
      }
      return true;
    }),
    korkeinHallintoOikeus: oikeusSchema(),
  }),
});
