import { mapValues } from "lodash";
import * as Yup from "yup";
import { ObjectShape, OptionalObjectSchema, AnyObject, TypeOfShape } from "yup/lib/object";
import { notInPastCheck, paivamaara } from "./paivamaaraSchema";
import { getAineistotNewSchema, getLadatutTiedostotNewSchema, isTestTypeBackend, isValidationModePublish, suunnitelmaFileNameSchema, TestType } from "./common";
import { ProjektiLisatiedolla, ValidationModeState } from "../ProjektiValidationContext";
import { ProjektiTyyppi } from "../graphql/apiModel";
import { getAineistoKategoriat } from "../aineistoKategoriat";

export type EnnakkoneuvotteluValidationContext = {
  validationMode: ValidationModeState;
  testType: TestType;
};

const getKunnallinenLadattuTiedostoSchema = () =>
  Yup.object().shape({
    tiedosto: Yup.string().nullable(),
    nimi: Yup.string().required(),
    uuid: Yup.string().required(),
    kunta: Yup.number().integer().required(),
  });

const getKunnallinenLadatutTiedostotSchema = () => {
  return Yup.array()
    .of(getKunnallinenLadattuTiedostoSchema())
    .nullable()
    .test("unique-file-names", "Samannimisiä tiedostoja", (value) => {
      if (!value) return true;
      const fileNames = value.map((file) => file.nimi);
      const uniqueFileNames = new Set(fileNames);
      return uniqueFileNames.size === fileNames.length;
    });
};

export const ennakkoNeuvotteluSchema = Yup.object().shape({
  oid: Yup.string().required(),
  versio: Yup.number().integer().required(),
  ennakkoNeuvottelu: Yup.object()
    .shape({
      poistumisPaiva: paivamaara()
        .defined()
        .when("$validationMode", {
          is: isValidationModePublish,
          then: (schema) =>
            schema.required("Päivämäärä on pakollinen").test("not-in-past", "Päivämäärää ei voi asettaa menneisyyteen", notInPastCheck),
        }),
      lisatiedot: Yup.string().defined(),
      kuulutuksetJaKutsu: getLadatutTiedostotNewSchema().defined(),
      lausunnot: getLadatutTiedostotNewSchema().defined(),
      maanomistajaluettelo: getLadatutTiedostotNewSchema().defined(),
      muuAineistoKoneelta: getLadatutTiedostotNewSchema().defined(),
      muuAineistoVelhosta: getAineistotNewSchema(false).defined(),
      hyvaksymisEsitys: getLadatutTiedostotNewSchema().defined(),
      muistutukset: Yup.lazy((obj) => Yup.object(mapValues(obj, () => getKunnallinenLadatutTiedostotSchema().defined()))),
      suunnitelma: Yup.lazy(() => suunnitelmaFileNameSchema()),
      vastaanottajat: Yup.array()
        .of(
          Yup.object()
            .shape({
              sahkoposti: Yup.string()
                .defined("Sähköposti on annettava")
                .when("$validationMode", {
                  is: isValidationModePublish,
                  then: (schema) => schema.email("Virheellinen sähköpostiosoite").required("Sähköposti on pakollinen"),
                }),
            })
            .required()
        )
        .min(1)
        .defined(),
    })
    .when(
      ["$testType", "$projekti"],
      (
        [testType, projekti]: [testType: TestType, projekti: ProjektiLisatiedolla],
        schema: OptionalObjectSchema<ObjectShape, AnyObject, TypeOfShape<ObjectShape>>
      ) =>
        testType === TestType.FRONTEND
          ? Yup.object().shape({
              muistutukset: Yup.lazy((obj) => Yup.object(mapValues(obj, () => getKunnallinenLadatutTiedostotSchema().defined()))),
              suunnitelma: suunnitelmaFrontendSchema(projekti.velho.tyyppi),
            })
          : schema
    )
    .when("$testType", {
      is: isTestTypeBackend,
      then: Yup.object().shape({
        muistutukset: getKunnallinenLadatutTiedostotSchema().defined(),
        suunnitelma: getAineistotNewSchema(true).defined(),
      }),
    }),
});

function suunnitelmaFrontendSchema(projektiTyyppi: ProjektiTyyppi | null | undefined) {
  const kategorioittenSchema = getAineistoKategoriat({ projektiTyyppi, showKategorisoimattomat: true })
    .listKategoriaIds()
    .reduce<ObjectShape>((obj, id) => {
      obj[id] = getAineistotNewSchema(true).defined();
      return obj;
    }, {});
  return Yup.object().shape(kategorioittenSchema);
}
