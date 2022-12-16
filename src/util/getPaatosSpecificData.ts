import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import {
  Hyvaksymispaatos,
  HyvaksymisPaatosVaihe,
  HyvaksymisPaatosVaiheJulkaisu,
  KasittelynTila,
  Projekti,
  TilasiirtymaTyyppi,
} from "@services/api";

export enum PaatosTyyppi {
  HYVAKSYMISPAATOS = "HYVAKSYMISPAATOS",
  JATKOPAATOS1 = "JATKOPAATOS1",
  JATKOPAATOS2 = "JATKOPAATOS2",
}

export const paatosIsJatkopaatos = (paatosTyyppi: PaatosTyyppi) =>
  [PaatosTyyppi.JATKOPAATOS1, PaatosTyyppi.JATKOPAATOS2].includes(paatosTyyppi);

export const paatosSpecificTilasiirtymaTyyppiMap: Record<PaatosTyyppi, TilasiirtymaTyyppi> = {
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

export interface PaatosSpecificData {
  julkaisu: HyvaksymisPaatosVaiheJulkaisu | null | undefined;
  julkaisematonPaatos: HyvaksymisPaatosVaihe | null | undefined;
  kasittelyntilaData: Hyvaksymispaatos | null | undefined;
}

export type PaatosJulkaisuAvain = keyof Pick<
  Projekti,
  "hyvaksymisPaatosVaiheJulkaisu" | "jatkoPaatos1VaiheJulkaisu" | "jatkoPaatos2VaiheJulkaisu"
>;

export type PaatosVaiheAvain = keyof Pick<Projekti, "hyvaksymisPaatosVaihe" | "jatkoPaatos1Vaihe" | "jatkoPaatos2Vaihe">;

export type PaatosAvain = keyof Pick<KasittelynTila, "hyvaksymispaatos" | "ensimmainenJatkopaatos" | "toinenJatkopaatos">;

export interface PaatoksenAvaimet {
  paatosJulkaisuAvain: PaatosJulkaisuAvain;
  paatosVaiheAvain: PaatosVaiheAvain;
  paatosAvain: PaatosAvain;
}

export const paatosSpecificRoutesMap: Record<PaatosTyyppi, PaatoksenAvaimet> = {
  HYVAKSYMISPAATOS: {
    paatosAvain: "hyvaksymispaatos",
    paatosJulkaisuAvain: "hyvaksymisPaatosVaiheJulkaisu",
    paatosVaiheAvain: "hyvaksymisPaatosVaihe",
  },
  JATKOPAATOS1: {
    paatosAvain: "ensimmainenJatkopaatos",
    paatosJulkaisuAvain: "jatkoPaatos1VaiheJulkaisu",
    paatosVaiheAvain: "jatkoPaatos1Vaihe",
  },
  JATKOPAATOS2: {
    paatosAvain: "toinenJatkopaatos",
    paatosJulkaisuAvain: "jatkoPaatos2VaiheJulkaisu",
    paatosVaiheAvain: "jatkoPaatos2Vaihe",
  },
};

export const getPaatosSpecificData: (projekti: ProjektiLisatiedolla, paatosTyyppi: PaatosTyyppi) => PaatosSpecificData = (
  projekti: ProjektiLisatiedolla,
  paatosTyyppi: PaatosTyyppi
) => {
  const { paatosAvain, paatosJulkaisuAvain, paatosVaiheAvain } = paatosSpecificRoutesMap[paatosTyyppi];

  return {
    julkaisu: projekti[paatosJulkaisuAvain],
    julkaisematonPaatos: projekti[paatosVaiheAvain],
    kasittelyntilaData: projekti.kasittelynTila?.[paatosAvain],
  };
};
