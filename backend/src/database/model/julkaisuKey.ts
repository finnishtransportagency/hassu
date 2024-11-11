import { DBProjekti } from "./projekti";

const aloituskuulutusKey: keyof DBProjekti = "aloitusKuulutusJulkaisut";
const vuorovaikutusKey: keyof DBProjekti = "vuorovaikutusKierrosJulkaisut";
const nahtavillaoloKey: keyof DBProjekti = "nahtavillaoloVaiheJulkaisut";
const hyvaksymisKey: keyof DBProjekti = "hyvaksymisPaatosVaiheJulkaisut";
const jatkopaatos1Key: keyof DBProjekti = "jatkoPaatos1VaiheJulkaisut";
const jatkopaatos2Key: keyof DBProjekti = "jatkoPaatos2VaiheJulkaisut";
export const JULKAISU_KEYS = [
  aloituskuulutusKey,
  vuorovaikutusKey,
  nahtavillaoloKey,
  hyvaksymisKey,
  jatkopaatos1Key,
  jatkopaatos2Key,
] as const;
export type JulkaisuKey = (typeof JULKAISU_KEYS)[number];
