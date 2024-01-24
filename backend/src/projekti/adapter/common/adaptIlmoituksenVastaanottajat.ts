import { IlmoituksenVastaanottajat } from "../../../database/model";
import * as API from "hassu-common/graphql/apiModel";

export function adaptIlmoituksenVastaanottajat(
  vastaanottajat: IlmoituksenVastaanottajat | null | undefined
): API.IlmoituksenVastaanottajat | undefined {
  if (!vastaanottajat) {
    return undefined;
  }
  const kunnat: API.KuntaVastaanottaja[] = vastaanottajat.kunnat?.map((kunta) => ({ __typename: "KuntaVastaanottaja", ...kunta })) ?? [];
  const viranomaiset: API.ViranomaisVastaanottaja[] =
    vastaanottajat.viranomaiset?.map((viranomainen) => ({
      __typename: "ViranomaisVastaanottaja",
      ...viranomainen,
    })) ?? [];
  return { __typename: "IlmoituksenVastaanottajat", kunnat, viranomaiset };
}
