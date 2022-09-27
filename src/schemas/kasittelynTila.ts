import { is2100Century, isValidDate } from "src/util/dateUtils";
import * as Yup from "yup";

const hyvaksymispaatosSchema = Yup.object()
  .shape({
    paatoksenPvm: Yup.string()
      .notRequired()
      .test("valid-date", "Virheellinen päivämäärä", (date) => {
        if (!date) {
          return true;
        }
        return isValidDate(date);
      })
      .test("valid-century", "Virheellinen päivämäärä", (date) => {
        if (!date || !isValidDate(date)) {
          return true;
        }
        return is2100Century(date);
      })
      .nullable()
      .default(null),
    asianumero: Yup.string().max(30, "Asianumero voi olla maksimissaan 30 merkkiä pitkä").notRequired().nullable().default(null),
  })
  .notRequired()
  .nullable()
  .default(null);

export const kasittelynTilaSchema = Yup.object().shape({
  kasittelynTila: Yup.object().shape({
    hyvaksymispaatos: hyvaksymispaatosSchema,
    ensimmainenJatkopaatos: hyvaksymispaatosSchema,
    toinenJatkopaatos: hyvaksymispaatosSchema,
  }),
});
