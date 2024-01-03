import * as API from "hassu-common/graphql/apiModel";
import { VuorovaikutusKierrosJulkaisu, VuorovaikutusTilaisuus, VuorovaikutusTilaisuusJulkaisu } from "../database/model";
import { examineJulkaisuPaiva } from "hassu-common/util/dateUtils";
import dayjs, { Dayjs } from "dayjs";

type EssentialVuorovaikutusKierrosJulkaisu = Pick<
  VuorovaikutusKierrosJulkaisu,
  "tila" | "vuorovaikutusJulkaisuPaiva" | "vuorovaikutusTilaisuudet"
>;
export type ProjektiVuorovaikutuksilla = {
  vuorovaikutusKierrosJulkaisut: EssentialVuorovaikutusKierrosJulkaisu[];
};

export function collectVuorovaikutusKierrosJulkinen<T extends EssentialVuorovaikutusKierrosJulkaisu>(
  vuorovaikutusKierrosJulkaisut: T[]
): T[] {
  if (!vuorovaikutusKierrosJulkaisut) return [];
  return (vuorovaikutusKierrosJulkaisut || []).filter(
    (julkaisu) =>
      examineJulkaisuPaiva(julkaisu.tila == API.VuorovaikutusKierrosTila.JULKINEN, julkaisu.vuorovaikutusJulkaisuPaiva).published
  ); // filtteröi pois loppukäytäjälle näkymättömät vuorovaikutuskierrokset
}

export function collectVuorovaikutusKierrosJulkaistu<T extends EssentialVuorovaikutusKierrosJulkaisu>(
  vuorovaikutusKierrosJulkaisut: T[]
): T[] {
  if (!vuorovaikutusKierrosJulkaisut) return [];
  return (vuorovaikutusKierrosJulkaisut || []).filter((julkaisu) => julkaisu.tila == API.VuorovaikutusKierrosTila.JULKINEN); // filtteröi pois loppukäytäjälle näkymättömät vuorovaikutuskierrokset
}

export function collectVuorovaikutusJulkinen(dbProjekti: ProjektiVuorovaikutuksilla): VuorovaikutusTilaisuusJulkaisu[] {
  if (!dbProjekti?.vuorovaikutusKierrosJulkaisut) return [];
  return collectVuorovaikutusKierrosJulkinen(dbProjekti.vuorovaikutusKierrosJulkaisut).reduce(
    (kaikkiTilaisuudet, julkaisu) => kaikkiTilaisuudet.concat(julkaisu.vuorovaikutusTilaisuudet ?? []),
    [] as VuorovaikutusTilaisuusJulkaisu[]
  ); // koosta kaikkien julisten kierrosten tilaisuudet
}

export function collectVuorovaikutusJulkaistu(dbProjekti: ProjektiVuorovaikutuksilla): VuorovaikutusTilaisuusJulkaisu[] {
  if (!dbProjekti?.vuorovaikutusKierrosJulkaisut) return [];
  return collectVuorovaikutusKierrosJulkaistu(dbProjekti.vuorovaikutusKierrosJulkaisut).reduce(
    (kaikkiTilaisuudet, julkaisu) => kaikkiTilaisuudet.concat(julkaisu.vuorovaikutusTilaisuudet ?? []),
    [] as VuorovaikutusTilaisuusJulkaisu[]
  ); // koosta kaikkien julisten kierrosten tilaisuudet
}

export function getLastJulkinenVuorovaikutusDateTime(dbProjekti: ProjektiVuorovaikutuksilla): Dayjs | undefined {
  const lastVuorovaikutus = collectEiPeruttuJulkinenVuorovaikutusSorted(dbProjekti).pop();
  if (!lastVuorovaikutus) return undefined;
  return dayjs(lastVuorovaikutus.paivamaara + lastVuorovaikutus.paattymisAika);
}

export function getLastJulkaistuVuorovaikutusDateTime(dbProjekti: ProjektiVuorovaikutuksilla): Dayjs | undefined {
  const lastVuorovaikutus = collectEiPeruttuJulkaistuVuorovaikutusSorted(dbProjekti).pop();
  if (!lastVuorovaikutus) return undefined;
  return dayjs(lastVuorovaikutus.paivamaara + lastVuorovaikutus.paattymisAika);
}

export function collectEiPeruttuJulkaistuVuorovaikutusSorted(dbProjekti: ProjektiVuorovaikutuksilla): VuorovaikutusTilaisuusJulkaisu[] {
  return collectVuorovaikutusJulkaistu(dbProjekti)
    .filter((tilaisuus) => !tilaisuus.peruttu)
    .sort(jarjestaLoppumisajanMukaan);
}

export function collectEiPeruttuJulkinenVuorovaikutusSorted(dbProjekti: ProjektiVuorovaikutuksilla): VuorovaikutusTilaisuusJulkaisu[] {
  return collectVuorovaikutusJulkinen(dbProjekti)
    .filter((tilaisuus) => !tilaisuus.peruttu)
    .sort(jarjestaLoppumisajanMukaan);
}

export function collectJulkinenVuorovaikutusSorted(dbProjekti: ProjektiVuorovaikutuksilla): VuorovaikutusTilaisuusJulkaisu[] {
  return collectVuorovaikutusJulkinen(dbProjekti).sort(jarjestaLoppumisajanMukaan);
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
