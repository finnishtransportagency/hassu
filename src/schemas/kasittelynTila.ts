import * as Yup from "yup";
import { paivamaara } from "./paivamaaraSchema";

const hyvaksymispaatosSchema = () =>
  Yup.object()
    .shape({
      paatoksenPvm: paivamaara(),
      asianumero: Yup.string().max(100, "Asiatunnus voi olla maksimissaan 100 merkkiä pitkä").notRequired().nullable(),
    })
    .test((value, context) => {
      if (!!value?.asianumero && !value?.paatoksenPvm) {
        context.createError({
          message: "Päivämäärä on annettava jos Asiatunnus on annettu",
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

export const kasittelynTilaSchema = Yup.object().shape({
  kasittelynTila: Yup.object().shape({
    hyvaksymispaatos: hyvaksymispaatosSchema(),
    ensimmainenJatkopaatos: hyvaksymispaatosSchema(),
    toinenJatkopaatos: hyvaksymispaatosSchema(),
    suunnitelmanTila: Yup.string(),
    hyvaksymisesitysTraficomiinPaiva: paivamaara().notRequired().nullable(),
    ennakkoneuvotteluPaiva: paivamaara().notRequired().nullable(),
    valitustenMaara: Yup.string().min(1, "Valitusten lukumäärä on pakollinen").nullable(),
    lainvoimaAlkaen: paivamaara().notRequired().nullable(),
    lainvoimaPaattyen: paivamaara().notRequired().nullable(),
    ennakkotarkastus: paivamaara().notRequired().nullable(),
    toimitusKaynnistynyt: paivamaara().notRequired().nullable(),
    liikenteeseenluovutusOsittain: paivamaara().notRequired().nullable(),
    liikenteeseenluovutusKokonaan: paivamaara().notRequired().nullable(),
    lisatieto: Yup.string().max(2000, "Lisätieto voi olla maksimissaan 2000 merkkiä pitkä").notRequired().nullable(),
  }),
});
