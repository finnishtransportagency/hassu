import { KuulutusSaamePDFt } from "../../database/model";
import { FILE_PATH_DELETED_PREFIX } from "hassu-common/links";
import { LadattuTiedostoPathsPair } from "./LadattuTiedostoPathsPair";
import { forEverySaameDo } from "../../projekti/adapter/common";
import { PathTuple } from "../../files/ProjektiPath";

export function getKuulutusSaamePDFt(
  saamePDFt: KuulutusSaamePDFt | null | undefined,
  paths: PathTuple,
  pathInDBProjekti:
    | "aloitusKuulutus.aloituskuulutusSaamePDFt"
    | "nahtavillaoloVaihe.nahtavillaoloSaamePDFt"
    | "hyvaksymisPaatosVaihe.hyvaksymisPaatosVaiheSaamePDFt"
    | "jatkoPaatos1Vaihe.hyvaksymisPaatosVaiheSaamePDFt"
    | "jatkoPaatos2Vaihe.hyvaksymisPaatosVaiheSaamePDFt"
): LadattuTiedostoPathsPair[] {
  const tiedostot: LadattuTiedostoPathsPair[] = [];
  if (saamePDFt) {
    forEverySaameDo((kieli) => {
      const pdfInKieli = saamePDFt[kieli];
      if (pdfInKieli) {
        tiedostot.push({
          tiedostot: pdfInKieli.kuulutusPDF,
          paths,
          pathInDBProjekti: `${pathInDBProjekti}.${kieli}.kuulutusPDF`,
        });
        tiedostot.push({
          tiedostot: pdfInKieli.kuulutusIlmoitusPDF,
          paths,
          pathInDBProjekti: `${pathInDBProjekti}.${kieli}.kuulutusIlmoitusPDF`,
        });
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
