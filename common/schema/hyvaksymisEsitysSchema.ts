import { ValidationMode, ValidationModeState } from "../ProjektiValidationContext";
import * as Yup from "yup";
import { getAineistotNewSchema, getLadatutTiedostotNewSchema } from "./common";
import { notInPastCheck, paivamaara } from "./paivamaaraSchema";

const getKunnallinenLadattuTiedostoSchema = () =>
  Yup.object().shape({
    tiedosto: Yup.string().nullable(),
    nimi: Yup.string().required(),
    jarjestys: Yup.number().integer().notRequired(),
    uuid: Yup.string().required(),
    kunta: Yup.number().integer().defined(),
  });

const getKunnallinenLadatutTiedostotSchema = () => Yup.array().of(getKunnallinenLadattuTiedostoSchema()).nullable();

const isValidationModePublish = (validationMode: ValidationModeState) => validationMode?.current === ValidationMode.PUBLISH;

export enum TestType {
  FRONTEND = "FRONTEND",
  BACKEND = "BACKEND",
}

export type HyvaksymisEsitysValidationContext = {
  validationMode: ValidationModeState;
  testType: TestType;
};

// Scheman kentät on oletuksena non nullableja ja defined-tarkistus estää ettei kentän arvot voi olla määrittämättä (undefined)
// defined-kenttien validointiviestit ei pitäisi tulla käyttöliittymälle koskaan sillä kenttien arvoja ei pitäisi saada määrittämättömäksi
export const hyvaksymisEsitysSchema = Yup.object().shape({
  oid: Yup.string().required(),
  versio: Yup.number().integer().required(),
  muokattavaHyvaksymisEsitys: Yup.object().shape({
    poistumisPaiva: paivamaara()
      .defined()
      .when("$validationMode", {
        is: isValidationModePublish,
        then: (schema) =>
          schema.required("Päivämäärä on pakollinen").test("not-in-past", "Päivämäärää ei voi asettaa menneisyyteen", notInPastCheck),
      }),
    kiireellinen: Yup.boolean().defined(),
    lisatiedot: Yup.string().defined(),
    laskutustiedot: Yup.object().shape({
      ovtTunnus: Yup.string()
        .defined("OVT-tunnus on annettava")
        .when("$validationMode", {
          is: isValidationModePublish,
          then: (schema) => schema.required("OVT-tunnus on pakollinen"),
        }),
      verkkolaskuoperaattorinTunnus: Yup.string()
        .defined("Verkkolaskuoperaattorin välittäjätunnus on annettava")
        .when("$validationMode", {
          is: isValidationModePublish,
          then: (schema) => schema.required("Verkkolaskuoperaattorin välittäjätunnus on pakollinen"),
        }),
      viitetieto: Yup.string()
        .defined("Viitetieto on annettava")
        .when("$validationMode", {
          is: isValidationModePublish,
          then: (schema) => schema.required("Viitetieto on pakollinen"),
        }),
    }),
    kuulutuksetJaKutsu: getLadatutTiedostotNewSchema().defined(),
    hyvaksymisEsitys: getLadatutTiedostotNewSchema()
      .defined()
      .when("$validationMode", {
        is: isValidationModePublish,
        then: (schema) => schema.min(1, "Hyväksymisesitys on pakollinen"),
      }),
    lausunnot: getLadatutTiedostotNewSchema().defined(),
    maanomistajaluettelo: getLadatutTiedostotNewSchema().defined(),
    muuAineistoKoneelta: getLadatutTiedostotNewSchema().defined(),
    muistutukset: getKunnallinenLadatutTiedostotSchema().defined(),
    suunnitelma: getAineistotNewSchema().defined(),
    muuAineistoVelhosta: getAineistotNewSchema().defined(),
    vastaanottajat: Yup.array()
      .of(
        Yup.object()
          .shape({
            sahkoposti: Yup.string()
              .defined("Sähköposti on annettava")
              .when("$validationMode", {
                is: isValidationModePublish,
                then: (schema) => schema.required("Sähköposti on pakollinen"),
              }),
          })
          .required()
      )
      .min(1)
      .defined(),
  }),
});
