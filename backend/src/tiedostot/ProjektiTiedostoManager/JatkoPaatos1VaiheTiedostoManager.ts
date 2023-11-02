import { KuulutusJulkaisuTila } from "hassu-common/graphql/apiModel";
import { AbstractHyvaksymisPaatosVaiheTiedostoManager, AineistoPathsPair, getKuulutusSaamePDFt } from ".";
import { HyvaksymisPaatosVaihe, HyvaksymisPaatosVaiheJulkaisu, LadattuTiedosto } from "../../database/model";
import { findJulkaisuWithTila } from "../../projekti/projektiUtil";
import { synchronizeFilesToPublic } from "../synchronizeFilesToPublic";
import { parseOptionalDate } from "../../util/dateUtil";

export class JatkoPaatos1VaiheTiedostoManager extends AbstractHyvaksymisPaatosVaiheTiedostoManager {
  getAineistot(vaihe: HyvaksymisPaatosVaihe): AineistoPathsPair[] {
    const paths = this.projektiPaths.jatkoPaatos1Vaihe(this.vaihe);
    return [
      { aineisto: vaihe.aineistoNahtavilla, paths },
      { aineisto: vaihe.hyvaksymisPaatos, paths: paths.paatos },
    ];
  }

  getLadatutTiedostot(vaihe: HyvaksymisPaatosVaihe): LadattuTiedosto[] {
    return getKuulutusSaamePDFt(vaihe.hyvaksymisPaatosVaiheSaamePDFt);
  }

  async synchronize(): Promise<boolean> {
    const julkaisu = findJulkaisuWithTila(this.julkaisut, KuulutusJulkaisuTila.HYVAKSYTTY);
    if (julkaisu) {
      return synchronizeFilesToPublic(
        this.oid,
        this.projektiPaths.jatkoPaatos1Vaihe(julkaisu),
        parseOptionalDate(julkaisu.kuulutusPaiva),
        parseOptionalDate(julkaisu.kuulutusVaihePaattyyPaiva)?.endOf("day")
      );
    }
    return true;
  }

  async deleteAineistotIfEpaaktiivinen(): Promise<HyvaksymisPaatosVaiheJulkaisu[]> {
    return [];
  }

  getAsianhallintaSynkronointi(): undefined {
    // Ei määritelty
    return undefined;
  }
}
