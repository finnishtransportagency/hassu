import * as Yup from "yup";
import { paivamaara } from "./paivamaaraSchema";

const hyvaksymispaatosSchema = Yup.object()
  .shape({
    paatoksenPvm: paivamaara({ preventFuture: true }),
    asianumero: Yup.string()
      .max(30, "Asiatunnus voi olla maksimissaan 30 merkkiä pitkä")
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
  }),
});
