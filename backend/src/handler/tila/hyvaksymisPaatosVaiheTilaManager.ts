import { KuulutusJulkaisuTila, NykyinenKayttaja } from "../../../../common/graphql/apiModel";
import { DBProjekti, HyvaksymisPaatosVaihe } from "../../database/model";
import { asiakirjaAdapter } from "../asiakirjaAdapter";
import { projektiDatabase } from "../../database/projektiDatabase";
import { IllegalArgumentError } from "../../error/IllegalArgumentError";
import { AbstractHyvaksymisPaatosVaiheTilaManager } from "./abstractHyvaksymisPaatosVaiheTilaManager";
import { ProjektiPaths } from "../../files/ProjektiPath";
import { aineistoSynchronizerService } from "../../aineisto/aineistoSynchronizerService";

class HyvaksymisPaatosVaiheTilaManager extends AbstractHyvaksymisPaatosVaiheTilaManager {
  async sendForApproval(projekti: DBProjekti, muokkaaja: NykyinenKayttaja): Promise<void> {
    const julkaisuWaitingForApproval = asiakirjaAdapter.findHyvaksymisPaatosVaiheWaitingForApproval(projekti);
    if (julkaisuWaitingForApproval) {
      throw new Error("HyvaksymisPaatosVaihe on jo olemassa odottamassa hyväksyntää");
    }

    await this.removeRejectionReasonIfExists(projekti, "hyvaksymisPaatosVaihe", this.getHyvaksymisPaatosVaihe(projekti));

    const julkaisu = asiakirjaAdapter.adaptHyvaksymisPaatosVaiheJulkaisu(projekti, projekti.hyvaksymisPaatosVaihe);
    if (!julkaisu.ilmoituksenVastaanottajat) {
      throw new IllegalArgumentError("Hyväksymispäätösvaiheelle on oltava ilmoituksenVastaanottajat!");
    }
    if (!julkaisu.hyvaksymisPaatos) {
      throw new IllegalArgumentError("Hyväksymispäätösvaiheella on oltava hyvaksymisPaatos!");
    }

    julkaisu.tila = KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA;
    julkaisu.muokkaaja = muokkaaja.uid;

    julkaisu.hyvaksymisPaatosVaihePDFt = await this.generatePDFs(
      projekti,
      julkaisu,
      new ProjektiPaths(projekti.oid).hyvaksymisPaatosVaihe(julkaisu)
    );

    await projektiDatabase.hyvaksymisPaatosVaiheJulkaisut.insert(projekti.oid, julkaisu);
  }

  async approve(projekti: DBProjekti, projektiPaallikko: NykyinenKayttaja): Promise<void> {
    const hyvaksymisPaatosVaihe = this.getHyvaksymisPaatosVaihe(projekti);
    const julkaisu = asiakirjaAdapter.findHyvaksymisPaatosVaiheWaitingForApproval(projekti);
    if (!julkaisu) {
      throw new Error("Ei hyvaksymisPaatosVaihetta odottamassa hyväksyntää");
    }
    await this.removeRejectionReasonIfExists(projekti, "hyvaksymisPaatosVaihe", hyvaksymisPaatosVaihe);
    julkaisu.tila = KuulutusJulkaisuTila.HYVAKSYTTY;
    julkaisu.hyvaksyja = projektiPaallikko.uid;

    await projektiDatabase.saveProjekti({ oid: projekti.oid, ajastettuTarkistus: this.getNextAjastettuTarkistus(julkaisu, true) });

    await projektiDatabase.hyvaksymisPaatosVaiheJulkaisut.update(projekti, julkaisu);
    await aineistoSynchronizerService.synchronizeProjektiFiles(projekti.oid);
  }

  async reject(projekti: DBProjekti, syy: string): Promise<void> {
    const julkaisu = asiakirjaAdapter.findHyvaksymisPaatosVaiheWaitingForApproval(projekti);
    if (!julkaisu) {
      throw new Error("Ei hyvaksymisPaatosVaihetta odottamassa hyväksyntää");
    }

    const hyvaksymisPaatosVaihe = this.getHyvaksymisPaatosVaihe(projekti);
    hyvaksymisPaatosVaihe.palautusSyy = syy;
    if (!julkaisu.hyvaksymisPaatosVaihePDFt) {
      throw new Error("julkaisu.hyvaksymisPaatosVaihePDFt puuttuu");
    }
    await this.deletePDFs(projekti.oid, julkaisu.hyvaksymisPaatosVaihePDFt);

    await projektiDatabase.saveProjekti({ oid: projekti.oid, hyvaksymisPaatosVaihe });
    await projektiDatabase.hyvaksymisPaatosVaiheJulkaisut.delete(projekti, julkaisu.id);
  }

  getHyvaksymisPaatosVaihe(projekti: DBProjekti): HyvaksymisPaatosVaihe {
    const hyvaksymisPaatosVaihe = projekti.hyvaksymisPaatosVaihe;
    if (!hyvaksymisPaatosVaihe) {
      throw new Error("Projektilla ei ole hyvaksymisPaatosVaihetta");
    }
    return hyvaksymisPaatosVaihe;
  }
}

export const hyvaksymisPaatosVaiheTilaManager = new HyvaksymisPaatosVaiheTilaManager();
