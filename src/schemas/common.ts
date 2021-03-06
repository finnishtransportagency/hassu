import * as Yup from "yup";
import { IlmoitettavaViranomainen } from "@services/api";
import filter from "lodash/filter";

export const ilmoituksenVastaanottajat = () =>
  Yup.object()
    .shape({
      kunnat: Yup.array()
        .of(
          Yup.object()
            .shape({
              nimi: Yup.string().required(),
              sahkoposti: Yup.string()
                .email("Virheellinen sähköpostiosoite")
                .required("Sähköpostiosoite on pakollinen"),
            })
            .required()
        )
        .compact(function (kunta) {
          return !kunta.nimi && !kunta.sahkoposti;
        })
        .notRequired(),
      viranomaiset: Yup.array()
        .of(
          Yup.object()
            .shape({
              nimi: Yup.mixed().oneOf(Object.values(IlmoitettavaViranomainen), "Viranomaistieto on pakollinen"),
              sahkoposti: Yup.string()
                .email("Virheellinen sähköpostiosoite")
                .required("Sähköpostiosoite on pakollinen"),
            })
            .test("unique", "Vastaanottaja on jo lisätty", (value, testContext) => {
              const duplikaatit = filter(testContext.parent, value);
              if (duplikaatit.length == 1) {
                return true;
              }
              return testContext.createError({
                path: `${testContext.path}.nimi`,
                message: "Viranomainen on jo valittu",
              });
            })
            .required()
        )
        .compact(function (viranomainen) {
          return !viranomainen.nimi && !viranomainen.sahkoposti;
        })
        .test("length", "Vähintään yksi viranomainen valittava", (arr, testContext) => {
          if (arr && arr.length >= 1) {
            return true;
          }
          return testContext.createError({
            path: `${testContext.path}`,
            message: "Vähintään yksi viranomainen on valittava",
          });
        }),
    })
    .required();
