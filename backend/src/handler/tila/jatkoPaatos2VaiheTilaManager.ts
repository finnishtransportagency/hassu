import { HyvaksymisPaatosVaiheTila, NykyinenKayttaja } from "../../../../common/graphql/apiModel";
import { DBProjekti, HyvaksymisPaatosVaihe } from "../../database/model";
import { asiakirjaAdapter } from "../asiakirjaAdapter";
import { projektiDatabase } from "../../database/projektiDatabase";
import { aineistoService } from "../../aineisto/aineistoService";
import { IllegalArgumentError } from "../../error/IllegalArgumentError";
import { AbstractHyvaksymisPaatosVaiheTilaManager } from "./abstractHyvaksymisPaatosVaiheTilaManager";

class JatkoPaatos2VaiheTilaManager extends AbstractHyvaksymisPaatosVaiheTilaManager {
  async sendForApproval(projekti: DBProjekti, muokkaaja: NykyinenKayttaja): Promise<void> {
    const julkaisuWaitingForApproval = asiakirjaAdapter.findJatkoPaatos2VaiheWaitingForApproval(projekti);
    if (julkaisuWaitingForApproval) {
      throw new Error("JatkoPaatos2Vaihe on jo olemassa odottamassa hyväksyntää");
    }

    await this.removeRejectionReasonIfExists(projekti, this.getHyvaksymisPaatosVaihe(projekti));

    const julkaisu = asiakirjaAdapter.adaptHyvaksymisPaatosVaiheJulkaisu(projekti, projekti.jatkoPaatos2Vaihe);
    if (!julkaisu.ilmoituksenVastaanottajat) {
      throw new IllegalArgumentError("Jatkopäätösvaiheelle on oltava ilmoituksenVastaanottajat!");
    }
    if (!julkaisu.hyvaksymisPaatos) {
      throw new IllegalArgumentError("Jatkopäätösvaiheella on oltava hyvaksymisPaatos!");
    }

    julkaisu.tila = HyvaksymisPaatosVaiheTila.ODOTTAA_HYVAKSYNTAA;
    julkaisu.muokkaaja = muokkaaja.uid;

    julkaisu.hyvaksymisPaatosVaihePDFt = await this.generatePDFs(projekti, julkaisu);

    await projektiDatabase.jatkoPaatos2VaiheJulkaisut.insert(projekti.oid, julkaisu);
  }

  async approve(projekti: DBProjekti, projektiPaallikko: NykyinenKayttaja): Promise<void> {
    const hyvaksymisPaatosVaihe = this.getHyvaksymisPaatosVaihe(projekti);
    const julkaisu = asiakirjaAdapter.findJatkoPaatos2VaiheWaitingForApproval(projekti);
    if (!julkaisu) {
      throw new Error("Ei JatkoPaatos2Vaihetta odottamassa hyväksyntää");
    }
    await this.removeRejectionReasonIfExists(projekti, hyvaksymisPaatosVaihe);
    julkaisu.tila = HyvaksymisPaatosVaiheTila.HYVAKSYTTY;
    julkaisu.hyvaksyja = projektiPaallikko.uid;

    await projektiDatabase.saveProjekti({ oid: projekti.oid, ajastettuTarkistus: this.getNextAjastettuTarkistus(julkaisu, false) });

    await projektiDatabase.jatkoPaatos2VaiheJulkaisut.update(projekti, julkaisu);
    await aineistoService.publishJatkoPaatos2Vaihe(projekti.oid, julkaisu.id);
  }

  async reject(projekti: DBProjekti, syy: string): Promise<void> {
    const julkaisu = asiakirjaAdapter.findJatkoPaatos2VaiheWaitingForApproval(projekti);
    if (!julkaisu) {
      throw new Error("Ei jatkoPaatos2Vaihetta odottamassa hyväksyntää");
    }

    const jatkoPaatos2Vaihe = this.getHyvaksymisPaatosVaihe(projekti);
    jatkoPaatos2Vaihe.palautusSyy = syy;
    if (!julkaisu.hyvaksymisPaatosVaihePDFt) {
      throw new Error("julkaisu.hyvaksymisPaatosVaihePDFt puuttuu");
    }
    await this.deletePDFs(projekti.oid, julkaisu.hyvaksymisPaatosVaihePDFt);

    await projektiDatabase.saveProjekti({ oid: projekti.oid, jatkoPaatos2Vaihe });
    await projektiDatabase.jatkoPaatos2VaiheJulkaisut.delete(projekti, julkaisu.id);
  }

  getHyvaksymisPaatosVaihe(projekti: DBProjekti): HyvaksymisPaatosVaihe {
    const hyvaksymisPaatosVaihe = projekti.jatkoPaatos2Vaihe;
    if (!hyvaksymisPaatosVaihe) {
      throw new Error("Projektilla ei ole jatkoPaatos2Vaihetta");
    }
    return hyvaksymisPaatosVaihe;
  }
}

export const jatkoPaatos2VaiheTilaManager = new JatkoPaatos2VaiheTilaManager();
