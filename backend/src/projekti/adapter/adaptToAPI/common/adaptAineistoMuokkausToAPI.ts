import { AineistoMuokkaus } from "../../../../database/model";
import * as API from "hassu-common/graphql/apiModel";

export function adaptAineistoMuokkausToAPI(aineistoMuokkaus: AineistoMuokkaus | null | undefined): API.AineistoMuokkaus | null | undefined {
  if (!aineistoMuokkaus) {
    return aineistoMuokkaus;
  }
  return {
    __typename: "AineistoMuokkaus",
    alkuperainenHyvaksymisPaiva: aineistoMuokkaus.alkuperainenHyvaksymisPaiva,
  };
}
