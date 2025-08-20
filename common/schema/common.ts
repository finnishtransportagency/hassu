import * as Yup from "yup";
import filter from "lodash/filter";
import { yhteystietoSchema } from "./yhteystieto";
import { IlmoitettavaViranomainen } from "../graphql/apiModel";
import { ValidationMode, ValidationModeState } from "../ProjektiValidationContext";

export enum TestType {
  FRONTEND = "FRONTEND",
  BACKEND = "BACKEND",
}

export const isValidationModePublish = (validationMode: ValidationModeState) => validationMode?.current === ValidationMode.PUBLISH;
export const isTestTypeFrontend = (testType: TestType) => testType === TestType.FRONTEND;
export const isTestTypeBackend = (testType: TestType) => testType === TestType.BACKEND;

const getAineistoSchema = () =>
  Yup.object().shape({
    dokumenttiOid: Yup.string().required(),
    nimi: Yup.string().required(),
    jarjestys: Yup.number().integer().notRequired(),
  });
export const getAineistotSchema = () => Yup.array().of(getAineistoSchema()).nullable();

const getAineistoNewSchema = (kategoriaPakollinenJulkaisussa: boolean) =>
  Yup.object().shape({
    dokumenttiOid: Yup.string().required(),
    kategoriaId: Yup.string()
      .nullable()
      .when("$validationMode", {
        is: (validationMode: ValidationModeState) => kategoriaPakollinenJulkaisussa && isValidationModePublish(validationMode),
        then: (schema) => schema.required("Kategoria on pakko asettaa"),
      }),
    nimi: Yup.string().required(),
    uuid: Yup.string().required(),
  });

export const getAineistotNewSchema = (kategoriaPakollinenJulkaisussa: boolean) => {
  return Yup.array()
    .of(getAineistoNewSchema(kategoriaPakollinenJulkaisussa))
    .nullable()
    .test("unique-file-names", "Samannimisiä tiedostoja", (value) => {
      if (!value) return true;
      const fileNames = value.map((file) => {
        return file.nimi;
      });
      const uniqueFileNames = new Set(fileNames);
      return uniqueFileNames.size === fileNames.length;
    });
};

const getLadattuTiedostoSchema = () =>
  Yup.object().shape({
    tiedosto: Yup.string().required(),
    nimi: Yup.string().required(),
    jarjestys: Yup.number().integer().notRequired(),
    tila: Yup.string().required(),
  });

export const getLadatutTiedostotSchema = () => Yup.array().of(getLadattuTiedostoSchema()).nullable();

const getLadattuTiedostoNewSchema = () =>
  Yup.object().shape({
    tiedosto: Yup.string().nullable(),
    nimi: Yup.string().required(),
    uuid: Yup.string().required(),
  });

export const getLadatutTiedostotNewSchema = () => {
  return Yup.array()
    .of(getLadattuTiedostoNewSchema())
    .nullable()
    .test("unique-file-names", "Samannimisiä tiedostoja", (value) => {
      if (!value) return true;
      const fileNames = value.map((file) => {
        return file.nimi;
      });
      const uniqueFileNames = new Set(fileNames);
      return uniqueFileNames.size === fileNames.length;
    });
};

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
      maakunnat: Yup.array()
        .of(
          Yup.object()
            .shape({
              id: Yup.number().required(),
              sahkoposti: Yup.string().email("Virheellinen sähköpostiosoite").required("Sähköpostiosoite on pakollinen"),
            })
            .required()
        )
        .compact(function (maakunta) {
          return !maakunta.id && !maakunta.sahkoposti;
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

export const suunnitelmaFileNameSchema = () =>
  Yup.object().test("unique-file-names", "Samannimisiä tiedostoja", (suunnitelma) => {
    if (!suunnitelma || typeof suunnitelma !== "object") return true;

    const allFileNames: string[] = [];
    for (const key of Object.keys(suunnitelma)) {
      const files = suunnitelma[key];

      if (Array.isArray(files)) {
        for (const file of files as { nimi?: string }[]) {
          if (file && typeof file.nimi === "string") {
            allFileNames.push(file.nimi);
          }
        }
      }
    }
    const uniqueFileNames = new Set(allFileNames);
    return uniqueFileNames.size === allFileNames.length;
  });
