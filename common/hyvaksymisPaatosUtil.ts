import {
  AsiakirjaTyyppi,
  Hyvaksymispaatos,
  HyvaksymisPaatosVaihe,
  HyvaksymisPaatosVaiheJulkaisu,
  KasittelynTila,
  NahtavillaoloVaiheJulkaisu,
  Projekti,
  Vaihe,
} from "./graphql/apiModel";

export enum PaatosTyyppi {
  HYVAKSYMISPAATOS = "HYVAKSYMISPAATOS",
  JATKOPAATOS1 = "JATKOPAATOS1",
  JATKOPAATOS2 = "JATKOPAATOS2",
}

export interface PaatosSpecificData {
  julkaisu: HyvaksymisPaatosVaiheJulkaisu | null | undefined;
  julkaisematonPaatos: HyvaksymisPaatosVaihe | null | undefined;
  kasittelyntilaData: Hyvaksymispaatos | null | undefined;
  edellisenVaiheenJulkaisu: HyvaksymisPaatosVaiheJulkaisu | NahtavillaoloVaiheJulkaisu | null | undefined;
}

export type PaatosJulkaisuAvain = keyof Pick<
  Projekti,
  "hyvaksymisPaatosVaiheJulkaisu" | "jatkoPaatos1VaiheJulkaisu" | "jatkoPaatos2VaiheJulkaisu"
>;

export type PaatosVaiheAvain = keyof Pick<Projekti, "hyvaksymisPaatosVaihe" | "jatkoPaatos1Vaihe" | "jatkoPaatos2Vaihe">;

export type PaatosAvain = keyof Pick<KasittelynTila, "hyvaksymispaatos" | "ensimmainenJatkopaatos" | "toinenJatkopaatos">;

export type PaatostaEdeltavanVaiheenJulkaisunAvain = keyof Pick<
  Projekti,
  "nahtavillaoloVaiheJulkaisu" | "hyvaksymisPaatosVaiheJulkaisu" | "jatkoPaatos1VaiheJulkaisu"
>;

export type HyvaksymisPaatosKuulutusAsiakirjaTyyppi = Extract<
  AsiakirjaTyyppi,
  | AsiakirjaTyyppi.HYVAKSYMISPAATOSKUULUTUS
  | AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA
  | AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_KUNNALLE_JA_TOISELLE_VIRANOMAISELLE
  | AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_LAUSUNNONANTAJILLE
  | AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_MUISTUTTAJILLE
  | AsiakirjaTyyppi.JATKOPAATOSKUULUTUS
  | AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA
  | AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA_KUNNALLE_JA_TOISELLE_VIRANOMAISELLE
  | AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA_MAAKUNTALIITOILLE
  | AsiakirjaTyyppi.JATKOPAATOSKUULUTUS2
  | AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA2
  | AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA2_KUNNALLE_JA_TOISELLE_VIRANOMAISELLE
  | AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA2_MAAKUNTALIITOILLE
>;

export interface PaatoksenAvaimet {
  paatosJulkaisuAvain: PaatosJulkaisuAvain;
  paatosVaiheAvain: PaatosVaiheAvain;
  paatosAvain: PaatosAvain;
  edellisenVaiheenJulkaisunAvain: PaatostaEdeltavanVaiheenJulkaisunAvain;
  paatosAsiakirjaTyyppi: HyvaksymisPaatosKuulutusAsiakirjaTyyppi;
  ilmoitusPaatoskuulutuksestaAsiakirjaTyyppi: HyvaksymisPaatosKuulutusAsiakirjaTyyppi;
  ilmoitusPaatoskuulutuksestaKunnalleJaToiselleViranomaiselleAsiakirjaTyyppi: HyvaksymisPaatosKuulutusAsiakirjaTyyppi;
  ilmoitusPaatoskuulutuksestaLausunnonantajilleAsiakirjaTyyppi: HyvaksymisPaatosKuulutusAsiakirjaTyyppi;
  ilmoitusPaatoskuulutuksestaMuistuttajilleAsiakirjaTyyppi?: HyvaksymisPaatosKuulutusAsiakirjaTyyppi;
}

export const paatosSpecificVaihe: Record<PaatosTyyppi, Vaihe> = {
  HYVAKSYMISPAATOS: Vaihe.HYVAKSYMISPAATOS,
  JATKOPAATOS1: Vaihe.JATKOPAATOS,
  JATKOPAATOS2: Vaihe.JATKOPAATOS2,
};

export const paatosSpecificRoutesMap: Record<PaatosTyyppi, PaatoksenAvaimet> = {
  HYVAKSYMISPAATOS: {
    paatosAvain: "hyvaksymispaatos",
    paatosJulkaisuAvain: "hyvaksymisPaatosVaiheJulkaisu",
    paatosVaiheAvain: "hyvaksymisPaatosVaihe",
    edellisenVaiheenJulkaisunAvain: "nahtavillaoloVaiheJulkaisu",
    paatosAsiakirjaTyyppi: AsiakirjaTyyppi.HYVAKSYMISPAATOSKUULUTUS,
    ilmoitusPaatoskuulutuksestaAsiakirjaTyyppi: AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA,
    ilmoitusPaatoskuulutuksestaKunnalleJaToiselleViranomaiselleAsiakirjaTyyppi:
      AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_KUNNALLE_JA_TOISELLE_VIRANOMAISELLE,
    ilmoitusPaatoskuulutuksestaLausunnonantajilleAsiakirjaTyyppi: AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_LAUSUNNONANTAJILLE,
    ilmoitusPaatoskuulutuksestaMuistuttajilleAsiakirjaTyyppi: AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_MUISTUTTAJILLE,
  },
  JATKOPAATOS1: {
    paatosAvain: "ensimmainenJatkopaatos",
    paatosJulkaisuAvain: "jatkoPaatos1VaiheJulkaisu",
    paatosVaiheAvain: "jatkoPaatos1Vaihe",
    edellisenVaiheenJulkaisunAvain: "hyvaksymisPaatosVaiheJulkaisu",
    paatosAsiakirjaTyyppi: AsiakirjaTyyppi.JATKOPAATOSKUULUTUS,
    ilmoitusPaatoskuulutuksestaAsiakirjaTyyppi: AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA,
    ilmoitusPaatoskuulutuksestaKunnalleJaToiselleViranomaiselleAsiakirjaTyyppi:
      AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA_KUNNALLE_JA_TOISELLE_VIRANOMAISELLE,
    ilmoitusPaatoskuulutuksestaLausunnonantajilleAsiakirjaTyyppi: AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA_MAAKUNTALIITOILLE,
  },
  JATKOPAATOS2: {
    paatosAvain: "toinenJatkopaatos",
    paatosJulkaisuAvain: "jatkoPaatos2VaiheJulkaisu",
    paatosVaiheAvain: "jatkoPaatos2Vaihe",
    edellisenVaiheenJulkaisunAvain: "jatkoPaatos1VaiheJulkaisu",
    paatosAsiakirjaTyyppi: AsiakirjaTyyppi.JATKOPAATOSKUULUTUS2,
    ilmoitusPaatoskuulutuksestaAsiakirjaTyyppi: AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA2,
    ilmoitusPaatoskuulutuksestaKunnalleJaToiselleViranomaiselleAsiakirjaTyyppi:
      AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA2_KUNNALLE_JA_TOISELLE_VIRANOMAISELLE,
    ilmoitusPaatoskuulutuksestaLausunnonantajilleAsiakirjaTyyppi: AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA2_MAAKUNTALIITOILLE,
  },
};

export const getPaatosSpecificData: (projekti: Projekti, paatosTyyppi: PaatosTyyppi) => PaatosSpecificData = (
  projekti: Projekti,
  paatosTyyppi: PaatosTyyppi
) => {
  const { paatosAvain, paatosJulkaisuAvain, paatosVaiheAvain, edellisenVaiheenJulkaisunAvain } = paatosSpecificRoutesMap[paatosTyyppi];

  return {
    julkaisu: projekti[paatosJulkaisuAvain],
    julkaisematonPaatos: projekti[paatosVaiheAvain],
    kasittelyntilaData: projekti.kasittelynTila?.[paatosAvain],
    edellisenVaiheenJulkaisu: projekti[edellisenVaiheenJulkaisunAvain],
  };
};
