import { Status, TilasiirtymaTyyppi } from "@services/api";
import { PaatosTyyppi } from "hassu-common/hyvaksymisPaatosUtil";

export interface PaatosPageLayoutData {
  paatosRoutePart: string;
  pageTitle: string;
}

export const paatosPageLayoutData: Record<PaatosTyyppi, PaatosPageLayoutData> = {
  HYVAKSYMISPAATOS: { paatosRoutePart: "hyvaksymispaatos", pageTitle: "Kuulutus hyväksymispäätöksestä" },
  JATKOPAATOS1: { paatosRoutePart: "jatkaminen1", pageTitle: "Kuulutus hyväksymispäätöksen jatkamisesta" },
  JATKOPAATOS2: { paatosRoutePart: "jatkaminen2", pageTitle: "Kuulutus hyväksymispäätöksen jatkamisesta" },
};

export const paatosSpecificStatuses: Record<PaatosTyyppi, { aineistoStatus: Status; status: Status }> = {
  HYVAKSYMISPAATOS: {
    aineistoStatus: Status.HYVAKSYMISMENETTELYSSA_AINEISTOT,
    status: Status.HYVAKSYMISMENETTELYSSA,
  },
  JATKOPAATOS1: {
    aineistoStatus: Status.JATKOPAATOS_1_AINEISTOT,
    status: Status.JATKOPAATOS_1,
  },
  JATKOPAATOS2: {
    aineistoStatus: Status.JATKOPAATOS_2_AINEISTOT,
    status: Status.JATKOPAATOS_2,
  },
};

export const paatosIsJatkopaatos = (paatosTyyppi: PaatosTyyppi) =>
  [PaatosTyyppi.JATKOPAATOS1, PaatosTyyppi.JATKOPAATOS2].includes(paatosTyyppi);

export const paatosSpecificTilasiirtymaTyyppiMap: Record<
  PaatosTyyppi,
  TilasiirtymaTyyppi.HYVAKSYMISPAATOSVAIHE | TilasiirtymaTyyppi.JATKOPAATOS_1 | TilasiirtymaTyyppi.JATKOPAATOS_2
> = {
  HYVAKSYMISPAATOS: TilasiirtymaTyyppi.HYVAKSYMISPAATOSVAIHE,
  JATKOPAATOS1: TilasiirtymaTyyppi.JATKOPAATOS_1,
  JATKOPAATOS2: TilasiirtymaTyyppi.JATKOPAATOS_2,
};

type GetNextPaatosTyyppiFunc = (paatosTyyppi: PaatosTyyppi) => PaatosTyyppi | undefined;
export const getNextPaatosTyyppi: GetNextPaatosTyyppiFunc = (paatosTyyppi) => {
  let nextPaatosTyyppi: PaatosTyyppi | undefined = undefined;
  switch (paatosTyyppi) {
    case PaatosTyyppi.HYVAKSYMISPAATOS:
      nextPaatosTyyppi = PaatosTyyppi.JATKOPAATOS1;
      break;
    case PaatosTyyppi.JATKOPAATOS1:
      nextPaatosTyyppi = PaatosTyyppi.JATKOPAATOS2;
      break;
    default:
      break;
  }
  return nextPaatosTyyppi;
};
