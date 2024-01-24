import { Hyvaksymispaatos, KasittelynTila, OikeudenPaatos } from "../../../database/model";
import * as API from "hassu-common/graphql/apiModel";

export function adaptKasittelynTilaToAPI(kasittelynTila?: KasittelynTila | null): API.KasittelynTila | undefined | null {
  if (kasittelynTila) {
    const { hyvaksymispaatos, ensimmainenJatkopaatos, toinenJatkopaatos, hallintoOikeus, korkeinHallintoOikeus, ...rest } = kasittelynTila;
    return {
      hyvaksymispaatos: adaptHyvaksymispaatos(hyvaksymispaatos),
      ensimmainenJatkopaatos: adaptHyvaksymispaatos(ensimmainenJatkopaatos),
      toinenJatkopaatos: adaptHyvaksymispaatos(toinenJatkopaatos),
      hallintoOikeus: adaptHallintoOikeus(hallintoOikeus),
      korkeinHallintoOikeus: adaptHallintoOikeus(korkeinHallintoOikeus),
      ...rest,
      __typename: "KasittelynTila",
    };
  }
  return kasittelynTila as undefined;
}

function adaptHallintoOikeus(hallintoOikeus: OikeudenPaatos | undefined): API.OikeudenPaatos | undefined {
  if (!hallintoOikeus) {
    return hallintoOikeus;
  }
  return {
    __typename: "OikeudenPaatos",
    hyvaksymisPaatosKumottu: hallintoOikeus.hyvaksymisPaatosKumottu,
    valipaatos: {
      __typename: "Paatos",
      ...hallintoOikeus.valipaatos,
    },
    paatos: {
      __typename: "Paatos",
      ...hallintoOikeus.paatos,
    },
  };
}

function adaptHyvaksymispaatos(hyvaksymispaatos: Hyvaksymispaatos | undefined): API.Hyvaksymispaatos | undefined | null {
  if (hyvaksymispaatos) {
    return {
      ...hyvaksymispaatos,
      __typename: "Hyvaksymispaatos",
    };
  }
  return hyvaksymispaatos;
}
