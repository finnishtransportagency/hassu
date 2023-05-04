import * as Yup from "yup";
import { paivamaara } from "./paivamaaraSchema";

const hyvaksymispaatosSchema = (isDisabledContextPath: string) =>
  Yup.object()
    .shape({
      paatoksenPvm: paivamaara(),
      asianumero: Yup.string().max(100, "Asiatunnus voi olla maksimissaan 100 merkkiä pitkä").notRequired().nullable(),
    })
    .test((value, context) => {
      if (context.options.context?.[isDisabledContextPath]) {
        return true;
      }
      if (!!value.asianumero && !value.paatoksenPvm) {
        return context.createError({
          message: "Päivämäärä on annettava jos Asiatunnus on annettu",
          path: `${context.path}.paatoksenPvm`,
          type: "custom",
        });
      }
      if (!value.asianumero && !!value.paatoksenPvm) {
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
    .default(null);

export const kasittelynTilaSchema = Yup.object().shape({
  kasittelynTila: Yup.object().shape({
    hyvaksymispaatos: hyvaksymispaatosSchema("hyvaksymispaatosDisabled"),
    ensimmainenJatkopaatos: hyvaksymispaatosSchema("ensimmainenJatkopaatosDisabled"),
    toinenJatkopaatos: hyvaksymispaatosSchema("toinenJatkopaatosDisabled"),
    suunnitelmanTila: Yup.string(),
    hyvaksymisesitysTraficomiinPaiva: paivamaara().notRequired().nullable().default(null),
    ennakkoneuvotteluPaiva: paivamaara().notRequired().nullable().default(null),
    valitustenMaara: Yup.string()
      .test({
        message: "Valitusten lukumäärä on pakollinen",
        test: (value, context) => {
          if (context.options.context?.valituksia) {
            if (!value) {
              return false;
            }
          }
          return true;
        },
      })
      .nullable(),
    lainvoimaAlkaen: paivamaara().notRequired().nullable().default(null),
    lainvoimaPaattyen: paivamaara().notRequired().nullable().default(null),
    ennakkotarkastus: paivamaara().notRequired().nullable().default(null),
    toimitusKaynnistynyt: paivamaara().notRequired().nullable().default(null),
    liikenteeseenluovutusOsittain: paivamaara().notRequired().nullable().default(null),
    liikenteeseenluovutusKokonaan: paivamaara().notRequired().nullable().default(null),
    lisatieto: Yup.string().max(2000, "Lisätieto voi olla maksimissaan 2000 merkkiä pitkä").notRequired().nullable().default(null),
  }),
});
