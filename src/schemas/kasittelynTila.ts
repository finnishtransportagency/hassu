import * as Yup from "yup";
import { paivamaara } from "./paivamaaraSchema";

const hyvaksymispaatosSchema = Yup.object()
  .shape({
    paatoksenPvm: paivamaara({ preventFuture: true }).test({
      message: "Päivämäärä pakollinen",
      test: (pvm, context) => {
        if (context.path.startsWith("kasittelynTila.hyvaksymispaatos.paatoksenPvm") && !pvm) {
          return false;
        }
        if (context.parent.asianumero && !pvm) {
          return false;
        }
        return true;
      },
    }),
    asianumero: Yup.string()
      .max(100, "Asiatunnus voi olla maksimissaan 100 merkkiä pitkä")
      .notRequired()
      .nullable()
      .test({
        message: "Asiatunnus pakollinen",
        test: (asianumero, context) => {
          if (context.parent.paatoksenPvm && !asianumero) {
            return false;
          }
          return true;
        },
      }),
  })
  .notRequired()
  .nullable()
  .default(null);

export const kasittelynTilaSchema = Yup.object().shape({
  kasittelynTila: Yup.object().shape({
    hyvaksymispaatos: hyvaksymispaatosSchema,
    ensimmainenJatkopaatos: hyvaksymispaatosSchema,
    toinenJatkopaatos: hyvaksymispaatosSchema,
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
