import * as Yup from "yup";
import { paivamaara } from "./paivamaaraSchema";

export const suunnittelunPerustiedotSchema = Yup.object().shape({
  oid: Yup.string().required(),
  vuorovaikutusKierros: Yup.object().shape({
    vuorovaikutusNumero: Yup.number().required(),
    arvioSeuraavanVaiheenAlkamisesta: Yup.string().required("Arvio ei voi olla tyhjä").nullable(),
    suunnittelunEteneminenJaKesto: Yup.string().nullable(),
    kysymyksetJaPalautteetViimeistaan: paivamaara({ preventPast: true }).required("Toivottu palautepäivämäärä täytyy antaa"),
  }),
});
