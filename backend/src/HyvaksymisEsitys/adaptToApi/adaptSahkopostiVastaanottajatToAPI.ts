import * as API from "hassu-common/graphql/apiModel";
import { SahkopostiVastaanottaja } from "../../database/model";

export function adaptSahkopostiVastaanottajatToAPI(
  vastaanottajat: SahkopostiVastaanottaja[] | undefined | null
): API.SahkopostiVastaanottaja[] | undefined | null {
  if (!vastaanottajat) {
    return vastaanottajat;
  }
  return vastaanottajat.map((vo) => ({ __typename: "SahkopostiVastaanottaja", ...vo }));
}
