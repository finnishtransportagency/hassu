import { MuokkausTila, Projekti, Vaihe, VuorovaikutusKierrosJulkaisu, VuorovaikutusKierrosTila } from "../graphql/apiModel";

export type JulkaisuAvain = keyof Pick<
  Projekti,
  | "aloitusKuulutusJulkaisu"
  | "vuorovaikutusKierrosJulkaisut"
  | "nahtavillaoloVaiheJulkaisu"
  | "hyvaksymisPaatosVaiheJulkaisu"
  | "jatkoPaatos1VaiheJulkaisu"
  | "jatkoPaatos2VaiheJulkaisu"
>;

export type VaiheAvain = keyof Pick<
  Projekti,
  "aloitusKuulutus" | "vuorovaikutusKierros" | "nahtavillaoloVaihe" | "hyvaksymisPaatosVaihe" | "jatkoPaatos1Vaihe" | "jatkoPaatos2Vaihe"
>;

export type JulkaisuData = Projekti[JulkaisuAvain];
export type VaiheData = Projekti[VaiheAvain];

const vaiheidenJulkaisukentat: Record<Vaihe, JulkaisuAvain> = {
  ALOITUSKUULUTUS: "aloitusKuulutusJulkaisu",
  SUUNNITTELU: "vuorovaikutusKierrosJulkaisut",
  NAHTAVILLAOLO: "nahtavillaoloVaiheJulkaisu",
  HYVAKSYMISPAATOS: "hyvaksymisPaatosVaiheJulkaisu",
  JATKOPAATOS: "jatkoPaatos1VaiheJulkaisu",
  JATKOPAATOS2: "jatkoPaatos2VaiheJulkaisu",
};

const vaiheidenKentat: Record<Vaihe, VaiheAvain> = {
  ALOITUSKUULUTUS: "aloitusKuulutus",
  SUUNNITTELU: "vuorovaikutusKierros",
  NAHTAVILLAOLO: "nahtavillaoloVaihe",
  HYVAKSYMISPAATOS: "hyvaksymisPaatosVaihe",
  JATKOPAATOS: "jatkoPaatos1Vaihe",
  JATKOPAATOS2: "jatkoPaatos2Vaihe",
};

export const haeVaiheenTiedot = (projekti: Projekti, vaihe: Vaihe): VaiheData => projekti[vaiheidenKentat[vaihe]];

export const haeJulkaisunTiedot = (projekti: Projekti, vaihe: Vaihe): JulkaisuData => projekti[vaiheidenJulkaisukentat[vaihe]];

export function julkaisuIsVuorovaikutusKierrosLista(julkaisu: JulkaisuData | null | undefined): julkaisu is VuorovaikutusKierrosJulkaisu[] {
  return Array.isArray(julkaisu);
}

type VaiheidenDatat = Record<Vaihe, { julkaisu: JulkaisuData; vaihe: VaiheData }>;

const getInitialVaiheidenDatat = (): VaiheidenDatat => ({
  ALOITUSKUULUTUS: { julkaisu: undefined, vaihe: undefined },
  HYVAKSYMISPAATOS: { julkaisu: undefined, vaihe: undefined },
  JATKOPAATOS: { julkaisu: undefined, vaihe: undefined },
  JATKOPAATOS2: { julkaisu: undefined, vaihe: undefined },
  NAHTAVILLAOLO: { julkaisu: undefined, vaihe: undefined },
  SUUNNITTELU: { julkaisu: undefined, vaihe: undefined },
});

export function vaiheOnMuokkausTilassa(projekti: Projekti, vaihe: Vaihe): boolean {
  const vaiheenData = projekti[vaiheidenKentat[vaihe]];
  if (vaiheenData?.__typename === "VuorovaikutusKierros") {
    return !vaiheenData?.tila || vaiheenData.tila === VuorovaikutusKierrosTila.MUOKATTAVISSA;
  } else {
    return !vaiheenData?.muokkausTila || vaiheenData.muokkausTila === MuokkausTila.MUOKKAUS;
  }
}

export const haeKaikkienVaiheidenTiedot = (projekti: Projekti): VaiheidenDatat => {
  const vaiheidenDatat: VaiheidenDatat = Object.values(Vaihe).reduce<VaiheidenDatat>((acc, vaihe) => {
    acc[vaihe] = { vaihe: haeVaiheenTiedot(projekti, vaihe), julkaisu: haeJulkaisunTiedot(projekti, vaihe) };
    return acc;
  }, getInitialVaiheidenDatat());

  return vaiheidenDatat;
};
