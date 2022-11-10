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

export interface PaatosSpecificData {
  julkaisut: HyvaksymisPaatosVaiheJulkaisu[] | null | undefined;
  viimeisinJulkaisu: HyvaksymisPaatosVaiheJulkaisu | null;
  julkaisematonPaatos: HyvaksymisPaatosVaihe | null | undefined;
  kasittelyntilaData: Hyvaksymispaatos | null | undefined;
}

export type PaatosJulkaisutAvain = keyof Pick<
  Projekti,
  "hyvaksymisPaatosVaiheJulkaisut" | "jatkoPaatos1VaiheJulkaisut" | "jatkoPaatos2VaiheJulkaisut"
>;

export type PaatosVaiheAvain = keyof Pick<Projekti, "hyvaksymisPaatosVaihe" | "jatkoPaatos1Vaihe" | "jatkoPaatos2Vaihe">;

export type PaatosAvain = keyof Pick<KasittelynTila, "hyvaksymispaatos" | "ensimmainenJatkopaatos" | "toinenJatkopaatos">;

export interface PaatoksenAvaimet {
  paatosJulkaisutAvain: PaatosJulkaisutAvain;
  paatosVaiheAvain: PaatosVaiheAvain;
  paatosAvain: PaatosAvain;
}

export const paatosSpecificRoutesMap: Record<PaatosTyyppi, PaatoksenAvaimet> = {
  HYVAKSYMISPAATOS: {
    paatosAvain: "hyvaksymispaatos",
    paatosJulkaisutAvain: "hyvaksymisPaatosVaiheJulkaisut",
    paatosVaiheAvain: "hyvaksymisPaatosVaihe",
  },
  JATKOPAATOS1: {
    paatosAvain: "ensimmainenJatkopaatos",
    paatosJulkaisutAvain: "jatkoPaatos1VaiheJulkaisut",
    paatosVaiheAvain: "jatkoPaatos1Vaihe",
  },
  JATKOPAATOS2: {
    paatosAvain: "toinenJatkopaatos",
    paatosJulkaisutAvain: "jatkoPaatos2VaiheJulkaisut",
    paatosVaiheAvain: "jatkoPaatos2Vaihe",
  },
};

export const getPaatosSpecificData: (projekti: ProjektiLisatiedolla, paatosTyyppi: PaatosTyyppi) => PaatosSpecificData = (
  projekti: ProjektiLisatiedolla,
  paatosTyyppi: PaatosTyyppi
) => {
  const { paatosAvain, paatosJulkaisutAvain, paatosVaiheAvain } = paatosSpecificRoutesMap[paatosTyyppi];
  const julkaisut = projekti[paatosJulkaisutAvain];

  return {
    julkaisut,
    viimeisinJulkaisu: julkaisut ? julkaisut[julkaisut.length - 1] : null,
    julkaisematonPaatos: projekti[paatosVaiheAvain],
    kasittelyntilaData: projekti.kasittelynTila?.[paatosAvain],
  };
};
