import { isValidDate } from "src/util/dateUtils";
import * as Yup from "yup";
import { yhteystietoSchema } from "./yhteystieto";

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
      esitettavatYhteystiedot: Yup.array().notRequired().of(yhteystietoSchema),
    }),
  }),
});
