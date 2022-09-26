import { IlmoituksenVastaanottajat } from "../../../database/model";
import * as API from "../../../../../common/graphql/apiModel";

export function adaptIlmoituksenVastaanottajat(vastaanottajat: IlmoituksenVastaanottajat): API.IlmoituksenVastaanottajat {
  if (!vastaanottajat.kunnat || !vastaanottajat.viranomaiset) {
    throw new Error("adaptIlmoituksenVastaanottajat: sekä kunnat että viranomaiset on oltava määriteltynä");
  }
  const kunnat: API.KuntaVastaanottaja[] = vastaanottajat.kunnat.map((kunta) => ({ __typename: "KuntaVastaanottaja", ...kunta })) || null;
  const viranomaiset: API.ViranomaisVastaanottaja[] =
    vastaanottajat.viranomaiset.map((viranomainen) => ({
      __typename: "ViranomaisVastaanottaja",
      ...viranomainen,
    })) || null;
  return { __typename: "IlmoituksenVastaanottajat", kunnat, viranomaiset };
}
