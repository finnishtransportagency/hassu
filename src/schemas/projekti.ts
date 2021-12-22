import { ProjektiRooli } from "@services/api";
import * as yup from "yup";

export enum ProjektiTestType {
  PROJEKTI_IS_LOADED = "PROJEKTI_IS_LOADED",
  PROJEKTI_IS_CREATED = "PROJEKTI_IS_CREATED",
  PROJEKTI_NOT_CREATED = "PROJEKTI_NOT_CREATED",
  PROJEKTI_HAS_PAALLIKKO = "PROJEKTI_HAS_PAALLIKKO",
}

const projektiSchema = yup
  .object()
  .nullable()
  .shape({
    tallennettu: yup.boolean(),
    kayttoOikeudet: yup.array().of(
      yup.object().shape({
        rooli: yup.mixed().oneOf(Object.values(ProjektiRooli)),
      })
    ),
  });

export type ProjektiSchema = typeof projektiSchema;

type TestFunction = (objectSchema: typeof projektiSchema) => typeof projektiSchema;

const projektiTestMap = new Map<ProjektiTestType, TestFunction>([
  [
    ProjektiTestType.PROJEKTI_IS_LOADED,
    (objectSchema) =>
      objectSchema.test(ProjektiTestType.PROJEKTI_IS_LOADED, "Projekti ei latautunut oikein", (projekti) => !!projekti),
  ],
  [
    ProjektiTestType.PROJEKTI_HAS_PAALLIKKO,
    (objectSchema) =>
      objectSchema.test(
        ProjektiTestType.PROJEKTI_HAS_PAALLIKKO,
        "Projektille ei ole asetettu projektipäällikköä",
        (projekti) =>
          !projekti || !!projekti?.kayttoOikeudet?.some(({ rooli }) => rooli === ProjektiRooli.PROJEKTIPAALLIKKO)
      ),
  ],
  [
    ProjektiTestType.PROJEKTI_IS_CREATED,
    (objectSchema) =>
      objectSchema.test(
        ProjektiTestType.PROJEKTI_IS_CREATED,
        "Projektia ei ole perustettu",
        (projekti) => !projekti || !!projekti?.tallennettu
      ),
  ],
  [
    ProjektiTestType.PROJEKTI_NOT_CREATED,
    (objectSchema) =>
      objectSchema.test(
        ProjektiTestType.PROJEKTI_NOT_CREATED,
        "Projekti on jo perustettu",
        (projekti) => !projekti || !projekti?.tallennettu
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
