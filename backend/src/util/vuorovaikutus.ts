import * as API from "../../../common/graphql/apiModel";
import { VuorovaikutusTilaisuus, VuorovaikutusTilaisuusJulkaisu, VuorovaikutusKierrosJulkaisu } from "../database/model";
import { examineJulkaisuPaiva } from "../../../common/util/dateUtils";
import dayjs, { Dayjs } from "dayjs";

function collectVuorovaikutusJulkinen(dbProjekti: {
  vuorovaikutusKierrosJulkaisut?: VuorovaikutusKierrosJulkaisu[] | null | undefined;
}): VuorovaikutusTilaisuusJulkaisu[] {
  if (!dbProjekti.vuorovaikutusKierrosJulkaisut) return [];
  return dbProjekti.vuorovaikutusKierrosJulkaisut
    ?.filter(
      (julkaisu) =>
        examineJulkaisuPaiva(julkaisu.tila == API.VuorovaikutusKierrosTila.JULKINEN, julkaisu.vuorovaikutusJulkaisuPaiva).published
    ) // filtteröi pois loppukäytäjälle näkymättömät vuorovaikutuskierrokset
    .reduce(
      (kaikkiTilaisuudet, julkaisu) => kaikkiTilaisuudet.concat(julkaisu.vuorovaikutusTilaisuudet || []),
      [] as VuorovaikutusTilaisuusJulkaisu[]
    ); // koosta kaikkien julisten kierrosten tilaisuudet
}

export function getLastVuorovaikutusDateTime(dbProjekti: {
  vuorovaikutusKierrosJulkaisut?: VuorovaikutusKierrosJulkaisu[] | null | undefined;
}): Dayjs | undefined {
  const lastVuorovaikutus = collectEiPeruttuVuorovaikutusSorted(dbProjekti).pop();
  if (!lastVuorovaikutus) return undefined;
  return dayjs(lastVuorovaikutus.paivamaara + lastVuorovaikutus.paattymisAika);
}

function collectEiPeruttuVuorovaikutusSorted(dbProjekti: {
  vuorovaikutusKierrosJulkaisut?: VuorovaikutusKierrosJulkaisu[] | null | undefined;
}): VuorovaikutusTilaisuusJulkaisu[] {
  return collectVuorovaikutusJulkinen(dbProjekti)
    .filter((tilaisuus) => !tilaisuus.peruttu)
    .sort(jarjestaLoppumisajanMukaan);
}

function jarjestaLoppumisajanMukaan(
  a: VuorovaikutusTilaisuusJulkaisu | VuorovaikutusTilaisuus,
  b: VuorovaikutusTilaisuusJulkaisu | VuorovaikutusTilaisuus
): number {
  const aLoppumisaika = new Date(a.paivamaara + a.paattymisAika).getTime();
  const bLoppumisaika = new Date(b.paivamaara + b.paattymisAika).getTime();
  return bLoppumisaika - aLoppumisaika;
}
