import * as Yup from "yup";
import { paivamaara } from "./paivamaaraSchema";

const getAineistoSchema = () =>
  Yup.object().shape({
    dokumenttiOid: Yup.string().required(),
    nimi: Yup.string().required(),
    jarjestys: Yup.number().integer().notRequired(),
  });
const getAineistotSchema = () => Yup.array().of(getAineistoSchema()).nullable();

export const suunnittelunPerustiedotSchema = Yup.object().shape({
  oid: Yup.string().required(),
  vuorovaikutusKierros: Yup.object().shape({
    vuorovaikutusNumero: Yup.number().required(),
    arvioSeuraavanVaiheenAlkamisesta: Yup.string().required("Arvio ei voi olla tyhjä").nullable(),
    suunnittelunEteneminenJaKesto: Yup.string().nullable(),
    esittelyaineisto: getAineistotSchema(),
    suunnitelmaluonnokset: getAineistotSchema(),
    videot: Yup.array()
      .notRequired()
      .of(
        Yup.object().shape({
          nimi: Yup.string(),
          url: Yup.string().url("URL ei kelpaa").notRequired(),
        })
      )
      .compact(function (linkki) {
        return !linkki.url;
      }),
    suunnittelumateriaali: Yup.object()
      .notRequired()
      .shape({
        nimi: Yup.string().test("nimi-puttuu", "Nimi puuttuu", (value, testContext) => {
          if (!value && testContext.parent.url) {
            return testContext.createError({
              path: `${testContext.path}`,
              message: "Nimi on annettava, jos osoite on annettu",
            });
          }
          return true;
        }),
        url: Yup.string()
          .url("URL ei kelpaa")
          .test("url-puttuu", "Url puuttuu", (value, testContext) => {
            if (!value && testContext.parent.nimi) {
              return testContext.createError({
                path: `${testContext.path}`,
                message: "Osoite on annettava, jos nimi on annettu",
              });
            }
            return true;
          }),
      }),
    kysymyksetJaPalautteetViimeistaan: paivamaara({ preventPast: true }).required("Toivottu palautepäivämäärä täytyy antaa"),
  }),
});
