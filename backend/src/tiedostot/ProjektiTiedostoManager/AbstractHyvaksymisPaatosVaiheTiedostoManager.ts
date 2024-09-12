import { VaiheTiedostoManager } from ".";
import { HyvaksymisPaatosVaihe, HyvaksymisPaatosVaiheJulkaisu, TiedotettavaKuulutusSaamePDFt } from "../../database/model";
import { forEverySaameDoAsync } from "../../projekti/adapter/adaptToDB";

export abstract class AbstractHyvaksymisPaatosVaiheTiedostoManager extends VaiheTiedostoManager<
  HyvaksymisPaatosVaihe,
  HyvaksymisPaatosVaiheJulkaisu
> {
  async deleteKuulutusSaamePDFtWhenEpaaktiivinen(saamePDFt: TiedotettavaKuulutusSaamePDFt | undefined | null): Promise<boolean> {
    let modified = false;
    if (saamePDFt) {
      await forEverySaameDoAsync(async (kieli) => {
        const saamePDF = saamePDFt?.[kieli];
        if (saamePDF) {
          modified = (await this.deleteLadattuTiedostoWhenEpaaktiivinen(saamePDF.kuulutusPDF)) || modified;
          modified = (await this.deleteLadattuTiedostoWhenEpaaktiivinen(saamePDF.kuulutusIlmoitusPDF)) || modified;
          modified = (await this.deleteLadattuTiedostoWhenEpaaktiivinen(saamePDF.kirjeTiedotettavillePDF)) || modified;
        }
      });
    }
    return modified;
  }
}
