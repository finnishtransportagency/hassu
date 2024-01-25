import * as Yup from "yup";
import { IlmoitettavaViranomainen } from "@services/api";
import filter from "lodash/filter";
import { yhteystietoSchema } from "./yhteystieto";

const getAineistoSchema = () =>
  Yup.object().shape({
    dokumenttiOid: Yup.string().required(),
    nimi: Yup.string().required(),
    jarjestys: Yup.number().integer().notRequired(),
  });
export const getAineistotSchema = () => Yup.array().of(getAineistoSchema()).nullable();

const getLadattuTiedostoSchema = () =>
  Yup.object().shape({
    tiedosto: Yup.string().required(),
    nimi: Yup.string().required(),
    jarjestys: Yup.number().integer().notRequired(),
    tila: Yup.string().required(),
  });
export const getLadatutTiedostotSchema = () => Yup.array().of(getLadattuTiedostoSchema()).nullable();

export const ilmoituksenVastaanottajat = () =>
  Yup.object()
    .shape({
      kunnat: Yup.array()
        .of(
          Yup.object()
            .shape({
              id: Yup.number().required(),
              sahkoposti: Yup.string().email("Virheellinen sähköpostiosoite").required("Sähköpostiosoite on pakollinen"),
            })
            .required()
        )
        .compact(function (kunta) {
          return !kunta.id && !kunta.sahkoposti;
        })
        .notRequired(),

      viranomaiset: Yup.array()
        .of(
          Yup.object()
            .shape({
              nimi: Yup.mixed().oneOf(Object.values(IlmoitettavaViranomainen), "Viranomaistieto on pakollinen"),
              sahkoposti: Yup.string().email("Virheellinen sähköpostiosoite").required("Sähköpostiosoite on pakollinen"),
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

export const standardiYhteystiedot = () =>
  Yup.object().shape({
    yhteysTiedot: Yup.array().of(yhteystietoSchema),
    yhteysHenkilot: Yup.array().of(Yup.string()),
  });
