import { UudelleenKuulutusInput } from "hassu-common/graphql/apiModel";
import { UudelleenKuulutus } from "../../../../database/model";
import mergeWith from "lodash/mergeWith";
import { preventArrayMergingCustomizer } from "../../../../util/preventArrayMergingCustomizer";

export function adaptUudelleenKuulutusToSave(
  uudelleenKuulutus: UudelleenKuulutus | null | undefined,
  input: UudelleenKuulutusInput | null | undefined
): UudelleenKuulutus | null | undefined {
  if (!input) {
    return uudelleenKuulutus;
  }
  return mergeWith({}, uudelleenKuulutus, input, preventArrayMergingCustomizer);
}
