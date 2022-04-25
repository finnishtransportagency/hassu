import { isValidDate } from "src/util/dateUtils";
import * as Yup from "yup";

export const vuorovaikutusSchema = Yup.object().shape({
  oid: Yup.string().required(),
  suunnitteluVaihe: Yup.object().shape({
    vuorovaikutus: Yup.object().shape({
      vuorovaikutusNumero: Yup.number().required(),
      vuorovaikutusJulkaisuPaiva: Yup.string()
        .required("Julkaisupäivä pitää antaa")
        .test("valid-date", "Virheellinen päivämäärä", (date) => {
          return isValidDate(date);
        }),
      kysymyksetJaPalautteetViimeistaan: Yup.string()
        .required("Toivottu palautepäivämäärä pitää antaa")
        .test("valid-date", "Virheellinen päivämäärä", (date) => {
          return isValidDate(date);
        }),
      vuorovaikutusTilaisuudet: Yup.array().of(
        Yup.object().shape({
          nimi: Yup.string().required("Tilaisuuden nimi täytyy antaa").nullable(),
        })
      ),
    }),
  }),
});
