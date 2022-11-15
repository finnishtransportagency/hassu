import { Hyvaksymispaatos, KasittelynTila } from "../../../database/model";
import * as API from "../../../../../common/graphql/apiModel";

export function adaptKasittelynTila(kasittelynTila?: KasittelynTila | null): API.KasittelynTila | undefined | null {
  if (kasittelynTila) {
    const { hyvaksymispaatos, ensimmainenJatkopaatos, toinenJatkopaatos, ...rest } = kasittelynTila;
    return {
      hyvaksymispaatos: adaptHyvaksymispaatos(hyvaksymispaatos),
      ensimmainenJatkopaatos: adaptHyvaksymispaatos(ensimmainenJatkopaatos),
      toinenJatkopaatos: adaptHyvaksymispaatos(toinenJatkopaatos),
      ...rest,
      __typename: "KasittelynTila",
    };
  }
  return kasittelynTila as undefined;
}

function adaptHyvaksymispaatos(hyvaksymispaatos: Hyvaksymispaatos | undefined): API.Hyvaksymispaatos | undefined | null {
  if (hyvaksymispaatos) {
    return {
      ...hyvaksymispaatos,
      __typename: "Hyvaksymispaatos",
    };
  }
  return hyvaksymispaatos as undefined;
}
