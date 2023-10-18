import { Vaihe, Projekti, VuorovaikutusKierrosTila, MuokkausTila } from "./graphql/apiModel";

export type VaiheKentta = keyof Pick<
  Projekti,
  "aloitusKuulutus" | "vuorovaikutusKierros" | "nahtavillaoloVaihe" | "hyvaksymisPaatosVaihe" | "jatkoPaatos1Vaihe" | "jatkoPaatos2Vaihe"
>;

export const vaiheidenKentat: Record<Vaihe, VaiheKentta> = {
  ALOITUSKUULUTUS: "aloitusKuulutus",
  SUUNNITTELU: "vuorovaikutusKierros",
  NAHTAVILLAOLO: "nahtavillaoloVaihe",
  HYVAKSYMISPAATOS: "hyvaksymisPaatosVaihe",
  JATKOPAATOS: "jatkoPaatos1Vaihe",
  JATKOPAATOS2: "jatkoPaatos2Vaihe",
};

export function vaiheOnMuokkausTilassa(projekti: Projekti, vaihe: Vaihe): boolean {
  const vaiheenData = projekti[vaiheidenKentat[vaihe]];
  if (vaiheenData?.__typename === "VuorovaikutusKierros") {
    return !vaiheenData?.tila || vaiheenData.tila === VuorovaikutusKierrosTila.MUOKATTAVISSA;
  } else {
    return !vaiheenData?.muokkausTila || vaiheenData.muokkausTila === MuokkausTila.MUOKKAUS;
  }
}
