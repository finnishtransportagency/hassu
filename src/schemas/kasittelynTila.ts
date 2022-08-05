import { isValidDate } from "src/util/dateUtils";
import * as Yup from "yup";

export const kasittelynTilaSchema = Yup.object().shape({
  kasittelynTila: Yup.object().shape({
    hyvaksymispaatos: Yup.object()
      .shape({
        paatoksenPvm: Yup.string()
          .notRequired()
          .test("valid-date", "Virheellinen päivämäärä", (date) => {
            if (!date) {
              return true;
            }
            return isValidDate(date);
          })
          .nullable()
          .default(null),
        asianumero: Yup.string()
          .max(30, "Asianumero voi olla maksimissaan 30 merkkiä pitkä")
          .notRequired()
          .nullable()
          .default(null),
      })
      .notRequired()
      .nullable()
      .default(null),

    ensimmainenJatkopaatos: Yup.object()
      .shape({
        paatoksenPvm: Yup.string()
          .notRequired()
          .test("valid-date", "Virheellinen päivämäärä", (date) => {
            if (!date) {
              return true;
            }
            return isValidDate(date);
          })
          .nullable()
          .default(null),
        asianumero: Yup.string()
          .max(30, "Asianumero voi olla maksimissaan 30 merkkiä pitkä")
          .notRequired()
          .nullable()
          .default(null),
      })
      .notRequired()
      .nullable()
      .default(null),

    toinenJatkopaatos: Yup.object()
      .shape({
        paatoksenPvm: Yup.string()
          .notRequired()
          .test("valid-date", "Virheellinen päivämäärä", (date) => {
            if (!date) {
              return true;
            }
            return isValidDate(date);
          })
          .nullable()
          .default(null),
        asianumero: Yup.string()
          .max(30, "Asianumero voi olla maksimissaan 30 merkkiä pitkä")
          .notRequired()
          .nullable()
          .default(null),
      })
      .notRequired()
      .nullable()
      .default(null),
  }),
});
