import { KuulutusJulkaisuTila, NykyinenKayttaja } from "../../../../common/graphql/apiModel";
import { DBProjekti, HyvaksymisPaatosVaihe, HyvaksymisPaatosVaiheJulkaisu } from "../../database/model";
import { asiakirjaAdapter } from "../asiakirjaAdapter";
import { projektiDatabase } from "../../database/projektiDatabase";
import { IllegalArgumentError } from "../../error/IllegalArgumentError";
import { AbstractHyvaksymisPaatosVaiheTilaManager } from "./abstractHyvaksymisPaatosVaiheTilaManager";
import { aineistoSynchronizerService } from "../../aineisto/aineistoSynchronizerService";
import { PathTuple, ProjektiPaths } from "../../files/ProjektiPath";
import { assertIsDefined } from "../../util/assertions";
import assert from "assert";
import { requireAdmin, requireOmistaja, requirePermissionMuokkaa } from "../../user/userService";

async function cleanupKuulutusAfterApproval(projekti: DBProjekti, jatkoPaatos2Vaihe: HyvaksymisPaatosVaihe) {
  if (jatkoPaatos2Vaihe.palautusSyy || jatkoPaatos2Vaihe.uudelleenKuulutus) {
    if (jatkoPaatos2Vaihe.palautusSyy) {
      jatkoPaatos2Vaihe.palautusSyy = null;
    }
    if (jatkoPaatos2Vaihe.uudelleenKuulutus) {
      jatkoPaatos2Vaihe.uudelleenKuulutus = null;
    }
    await projektiDatabase.saveProjekti({ oid: projekti.oid, jatkoPaatos2Vaihe });
  }
}

class JatkoPaatos2VaiheTilaManager extends AbstractHyvaksymisPaatosVaiheTilaManager {
  getVaihe(projekti: DBProjekti): HyvaksymisPaatosVaihe {
    const vaihe = projekti.jatkoPaatos2Vaihe;
    assertIsDefined(vaihe, "Projektilla ei ole jatkoPaatos2Vaihetta");
    return vaihe;
  }

  getJulkaisut(projekti: DBProjekti): HyvaksymisPaatosVaiheJulkaisu[] | undefined {
    return projekti.jatkoPaatos2VaiheJulkaisut || undefined;
  }

  validateUudelleenkuulutus(
    _projekti: DBProjekti,
    kuulutus: HyvaksymisPaatosVaihe,
    hyvaksyttyJulkaisu: HyvaksymisPaatosVaiheJulkaisu | undefined
  ): void {
    // Tarkista, että on olemassa hyväksytty julkaisu, jonka perua
    if (!hyvaksyttyJulkaisu) {
      throw new IllegalArgumentError("Ei ole olemassa kuulutusta, jota uudelleenkuuluttaa");
    }
    assert(kuulutus, "Projektilla pitäisi olla jatkopäätös2kuulutus, jos sitä uudelleenkuulutetaan");
    // Uudelleenkuulutus ei ole mahdollista jos uudelleenkuulutus on jo olemassa
    if (kuulutus.uudelleenKuulutus) {
      throw new IllegalArgumentError("Et voi uudelleenkuuluttaa jatkopäätös2kuulutusta, koska uudelleenkuulutus on jo olemassa");
    }
  }

  getProjektiPathForKuulutus(projekti: DBProjekti, kuulutus: HyvaksymisPaatosVaihe | null | undefined): PathTuple {
    return new ProjektiPaths(projekti.oid).jatkoPaatos2Vaihe(kuulutus);
  }

  async saveVaihe(projekti: DBProjekti, jatkoPaatos1Vaihe: HyvaksymisPaatosVaihe): Promise<void> {
    await projektiDatabase.saveProjekti({ oid: projekti.oid, jatkoPaatos1Vaihe });
  }

  checkPriviledgesApproveReject(projekti: DBProjekti): NykyinenKayttaja {
    const projektiPaallikko = requireOmistaja(projekti);
    return projektiPaallikko;
  }

  checkPriviledgesSendForApproval(projekti: DBProjekti): NykyinenKayttaja {
    const muokkaaja = requirePermissionMuokkaa(projekti);
    return muokkaaja;
  }

  checkUudelleenkuulutusPriviledges(projekti: DBProjekti): NykyinenKayttaja {
    return requireAdmin();
  }

  async sendForApproval(projekti: DBProjekti, muokkaaja: NykyinenKayttaja): Promise<void> {
    const julkaisuWaitingForApproval = asiakirjaAdapter.findJatkoPaatos2VaiheWaitingForApproval(projekti);
    if (julkaisuWaitingForApproval) {
      throw new Error("JatkoPaatos2Vaihe on jo olemassa odottamassa hyväksyntää");
    }

    await this.removeRejectionReasonIfExists(projekti, "jatkoPaatos2Vaihe", this.getHyvaksymisPaatosVaihe(projekti));

    const julkaisu = asiakirjaAdapter.adaptHyvaksymisPaatosVaiheJulkaisu(projekti, projekti.jatkoPaatos2Vaihe);
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
      new ProjektiPaths(projekti.oid).jatkoPaatos2Vaihe(julkaisu)
    );

    await projektiDatabase.jatkoPaatos2VaiheJulkaisut.insert(projekti.oid, julkaisu);
  }

  async approve(projekti: DBProjekti, projektiPaallikko: NykyinenKayttaja): Promise<void> {
    const hyvaksymisPaatosVaihe = this.getHyvaksymisPaatosVaihe(projekti);
    const julkaisu = asiakirjaAdapter.findJatkoPaatos2VaiheWaitingForApproval(projekti);
    if (!julkaisu) {
      throw new Error("Ei JatkoPaatos2Vaihetta odottamassa hyväksyntää");
    }
    cleanupKuulutusAfterApproval(projekti, hyvaksymisPaatosVaihe);
    julkaisu.tila = KuulutusJulkaisuTila.HYVAKSYTTY;
    julkaisu.hyvaksyja = projektiPaallikko.uid;

    await projektiDatabase.saveProjekti({ oid: projekti.oid, ajastettuTarkistus: this.getNextAjastettuTarkistus(julkaisu, false) });

    await projektiDatabase.jatkoPaatos2VaiheJulkaisut.update(projekti, julkaisu);
    await aineistoSynchronizerService.synchronizeProjektiFiles(projekti.oid);
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
