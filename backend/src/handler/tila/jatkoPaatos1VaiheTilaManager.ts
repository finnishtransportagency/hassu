import { KuulutusJulkaisuTila, NykyinenKayttaja } from "../../../../common/graphql/apiModel";
import { DBProjekti, HyvaksymisPaatosVaihe } from "../../database/model";
import { asiakirjaAdapter } from "../asiakirjaAdapter";
import { projektiDatabase } from "../../database/projektiDatabase";
import { aineistoService } from "../../aineisto/aineistoService";
import { IllegalArgumentError } from "../../error/IllegalArgumentError";
import { AbstractHyvaksymisPaatosVaiheTilaManager } from "./abstractHyvaksymisPaatosVaiheTilaManager";
import { ProjektiPaths } from "../../files/ProjektiPath";

class JatkoPaatos1VaiheTilaManager extends AbstractHyvaksymisPaatosVaiheTilaManager {
  async sendForApproval(projekti: DBProjekti, muokkaaja: NykyinenKayttaja): Promise<void> {
    const julkaisuWaitingForApproval = asiakirjaAdapter.findJatkoPaatos1VaiheWaitingForApproval(projekti);
    if (julkaisuWaitingForApproval) {
      throw new Error("JatkoPaatos1Vaihe on jo olemassa odottamassa hyväksyntää");
    }

    await this.removeRejectionReasonIfExists(projekti, "jatkoPaatos1Vaihe", this.getHyvaksymisPaatosVaihe(projekti));

    const julkaisu = asiakirjaAdapter.adaptHyvaksymisPaatosVaiheJulkaisu(projekti, projekti.jatkoPaatos1Vaihe);
    if (!julkaisu.ilmoituksenVastaanottajat) {
      throw new IllegalArgumentError("Jatkopäätösvaiheelle on oltava ilmoituksenVastaanottajat!");
    }
    if (!julkaisu.hyvaksymisPaatos) {
      throw new IllegalArgumentError("Jatkopäätösvaiheella on oltava hyvaksymisPaatos!");
    }

    julkaisu.tila = KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA;
    julkaisu.muokkaaja = muokkaaja.uid;

    julkaisu.hyvaksymisPaatosVaihePDFt = await this.generatePDFs(
      projekti,
      julkaisu,
      new ProjektiPaths(projekti.oid).jatkoPaatos1Vaihe(julkaisu)
    );

    await projektiDatabase.jatkoPaatos1VaiheJulkaisut.insert(projekti.oid, julkaisu);
  }

  async approve(projekti: DBProjekti, projektiPaallikko: NykyinenKayttaja): Promise<void> {
    const hyvaksymisPaatosVaihe = this.getHyvaksymisPaatosVaihe(projekti);
    const julkaisu = asiakirjaAdapter.findJatkoPaatos1VaiheWaitingForApproval(projekti);
    if (!julkaisu) {
      throw new Error("Ei JatkoPaatos1Vaihetta odottamassa hyväksyntää");
    }
    await this.removeRejectionReasonIfExists(projekti, "jatkoPaatos1Vaihe", hyvaksymisPaatosVaihe);
    julkaisu.tila = KuulutusJulkaisuTila.HYVAKSYTTY;
    julkaisu.hyvaksyja = projektiPaallikko.uid;

    await projektiDatabase.saveProjekti({ oid: projekti.oid, ajastettuTarkistus: this.getNextAjastettuTarkistus(julkaisu, false) });

    await projektiDatabase.jatkoPaatos1VaiheJulkaisut.update(projekti, julkaisu);
    await aineistoService.synchronizeProjektiFiles(projekti.oid);
  }

  async reject(projekti: DBProjekti, syy: string): Promise<void> {
    const julkaisu = asiakirjaAdapter.findJatkoPaatos1VaiheWaitingForApproval(projekti);
    if (!julkaisu) {
      throw new Error("Ei jatkoPaatos1Vaihetta odottamassa hyväksyntää");
    }

    const jatkoPaatos1Vaihe = this.getHyvaksymisPaatosVaihe(projekti);
    jatkoPaatos1Vaihe.palautusSyy = syy;
    if (!julkaisu.hyvaksymisPaatosVaihePDFt) {
      throw new Error("julkaisu.hyvaksymisPaatosVaihePDFt puuttuu");
    }
    await this.deletePDFs(projekti.oid, julkaisu.hyvaksymisPaatosVaihePDFt);

    await projektiDatabase.saveProjekti({ oid: projekti.oid, jatkoPaatos1Vaihe });
    await projektiDatabase.jatkoPaatos1VaiheJulkaisut.delete(projekti, julkaisu.id);
  }

  getHyvaksymisPaatosVaihe(projekti: DBProjekti): HyvaksymisPaatosVaihe {
    const hyvaksymisPaatosVaihe = projekti.jatkoPaatos1Vaihe;
    if (!hyvaksymisPaatosVaihe) {
      throw new Error("Projektilla ei ole jatkoPaatos1Vaihetta");
    }
    return hyvaksymisPaatosVaihe;
  }
}

export const jatkoPaatos1VaiheTilaManager = new JatkoPaatos1VaiheTilaManager();
