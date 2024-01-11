import { KuulutusSaamePDFt, LadattuTiedosto } from "../../database/model";
import { forEverySaameDo } from "../../projekti/adapter/common";
import { FILE_PATH_DELETED_PREFIX } from "hassu-common/links";

export function getKuulutusSaamePDFt(saamePDFt: KuulutusSaamePDFt | null | undefined): LadattuTiedosto[] {
  const tiedostot: LadattuTiedosto[] = [];
  if (saamePDFt) {
    forEverySaameDo((kieli) => {
      const pdft = saamePDFt[kieli];
      if (pdft?.kuulutusPDF) {
        tiedostot.push(pdft.kuulutusPDF);
      }
      if (pdft?.kuulutusIlmoitusPDF) {
        tiedostot.push(pdft.kuulutusIlmoitusPDF);
      }
    });
  }
  return tiedostot;
}

export function makeFilePathDeleted(filepath: string): string {
  if (!filepath.startsWith(FILE_PATH_DELETED_PREFIX)) {
    return FILE_PATH_DELETED_PREFIX + filepath;
  }
  return filepath;
}
