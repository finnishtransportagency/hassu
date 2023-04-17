import * as API from "../../../common/graphql/apiModel";
import { VuorovaikutusTilaisuus, VuorovaikutusTilaisuusJulkaisu } from "../database/model";
import { examineJulkaisuPaiva } from "../../../common/util/dateUtils";
import dayjs, { Dayjs } from "dayjs";

export type ProjektiVuorovaikutuksilla = {
  vuorovaikutusKierrosJulkaisut: {
    tila: API.VuorovaikutusKierrosTila;
    vuorovaikutusJulkaisuPaiva: string;
    vuorovaikutusTilaisuudet: VuorovaikutusTilaisuusJulkaisu[];
  }[];
};

export function collectVuorovaikutusJulkinen(dbProjekti: ProjektiVuorovaikutuksilla): VuorovaikutusTilaisuusJulkaisu[] {
  if (!dbProjekti.vuorovaikutusKierrosJulkaisut) return [];
  return (dbProjekti.vuorovaikutusKierrosJulkaisut || [])
    .filter(
      (julkaisu) =>
        examineJulkaisuPaiva(julkaisu.tila == API.VuorovaikutusKierrosTila.JULKINEN, julkaisu.vuorovaikutusJulkaisuPaiva).published
    ) // filtteröi pois loppukäytäjälle näkymättömät vuorovaikutuskierrokset
    .reduce(
      (kaikkiTilaisuudet, julkaisu) => kaikkiTilaisuudet.concat(julkaisu.vuorovaikutusTilaisuudet || []),
      [] as VuorovaikutusTilaisuusJulkaisu[]
    ); // koosta kaikkien julisten kierrosten tilaisuudet
}

export function getLastVuorovaikutusDateTime(dbProjekti: ProjektiVuorovaikutuksilla): Dayjs | undefined {
  const lastVuorovaikutus = collectEiPeruttuVuorovaikutusSorted(dbProjekti).pop();
  if (!lastVuorovaikutus) return undefined;
  return dayjs(lastVuorovaikutus.paivamaara + lastVuorovaikutus.paattymisAika);
}

export function collectEiPeruttuVuorovaikutusSorted(dbProjekti: ProjektiVuorovaikutuksilla): VuorovaikutusTilaisuusJulkaisu[] {
  return collectVuorovaikutusJulkinen(dbProjekti)
    .filter((tilaisuus) => !tilaisuus.peruttu)
    .sort(jarjestaLoppumisajanMukaan);
}

export function jarjestaLoppumisajanMukaan(
  a: VuorovaikutusTilaisuusJulkaisu | VuorovaikutusTilaisuus,
  b: VuorovaikutusTilaisuusJulkaisu | VuorovaikutusTilaisuus
): number {
  const aLoppumisaika = getEndTime(a);
  const bLoppumisaika = getEndTime(b);
  return aLoppumisaika - bLoppumisaika;
}

export function getEndTime(tilaisuus: VuorovaikutusTilaisuusJulkaisu | VuorovaikutusTilaisuus): number {
  return dayjs(tilaisuus.paivamaara + tilaisuus.paattymisAika)
    .toDate()
    .getTime();
}
