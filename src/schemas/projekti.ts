import * as yup from "yup";
import { KayttajaTyyppi, Viranomainen } from "../../common/graphql/apiModel";
import getAsiatunnus from "../util/getAsiatunnus";

export enum ProjektiTestType {
  PROJEKTI_IS_LOADED = "PROJEKTI_IS_LOADED",
  PROJEKTI_IS_CREATED = "PROJEKTI_IS_CREATED",
  PROJEKTI_NOT_CREATED = "PROJEKTI_NOT_CREATED",
  PROJEKTI_HAS_PAALLIKKO = "PROJEKTI_HAS_PAALLIKKO",
  PROJEKTI_HAS_ASIATUNNUS = "PROJEKTI_HAS_ASIATUNNUS",
}

const projektiSchema = yup
  .object()
  .nullable()
  .shape({
    tallennettu: yup.boolean().nullable(),
    kayttoOikeudet: yup.array().of(yup.object()),
    velho: yup.object().shape({
      suunnittelustaVastaavaViranomainen: yup.mixed<Viranomainen>(),
      asiatunnusVayla: yup.string(),
      asiatunnusELY: yup.string().notRequired().nullable(),
    }),
  });

export type ProjektiSchema = typeof projektiSchema;

type TestFunction = (objectSchema: typeof projektiSchema) => typeof projektiSchema;

const projektiTestMap = new Map<ProjektiTestType, TestFunction>([
  [
    ProjektiTestType.PROJEKTI_IS_LOADED,
    (objectSchema) =>
      objectSchema.test(ProjektiTestType.PROJEKTI_IS_LOADED, "Projekti ei latautunut oikein", (projekti) => !!projekti?.oid),
  ],
  [
    ProjektiTestType.PROJEKTI_HAS_PAALLIKKO,
    (objectSchema) =>
      objectSchema.test(
        ProjektiTestType.PROJEKTI_HAS_PAALLIKKO,
        "Projektille ei ole asetettu projektipäällikköä",
        (projekti) => !projekti?.oid || !!projekti?.kayttoOikeudet?.some(({ tyyppi }) => tyyppi === KayttajaTyyppi.PROJEKTIPAALLIKKO)
      ),
  ],
  [
    ProjektiTestType.PROJEKTI_HAS_ASIATUNNUS,
    (objectSchema) =>
      objectSchema.test(ProjektiTestType.PROJEKTI_HAS_ASIATUNNUS, "Projektille ei ole asetettu asiatunnusta", (projekti) => {
        return !!getAsiatunnus(projekti);
      }),
  ],
  [
    ProjektiTestType.PROJEKTI_IS_CREATED,
    (objectSchema) =>
      objectSchema.test(
        ProjektiTestType.PROJEKTI_IS_CREATED,
        "Projektia ei ole perustettu",
        (projekti) => !projekti?.oid || !!projekti?.tallennettu
      ),
  ],
  [
    ProjektiTestType.PROJEKTI_NOT_CREATED,
    (objectSchema) =>
      objectSchema.test(
        ProjektiTestType.PROJEKTI_NOT_CREATED,
        "Projekti on jo perustettu",
        (projekti) => !projekti?.oid || !projekti?.tallennettu
      ),
  ],
]);

export const getProjektiValidationSchema = (projektiTests: ProjektiTestType[]) => {
  return projektiTests.reduce((schema, testType) => {
    const test = projektiTestMap.get(testType);
    if (test) {
      return test(schema);
    }
    return schema;
  }, projektiSchema);
};
