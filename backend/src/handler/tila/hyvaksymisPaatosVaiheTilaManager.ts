import { KuulutusJulkaisuTila, NykyinenKayttaja } from "../../../../common/graphql/apiModel";
import { DBProjekti, HyvaksymisPaatosVaihe, HyvaksymisPaatosVaiheJulkaisu } from "../../database/model";
import { asiakirjaAdapter } from "../asiakirjaAdapter";
import { projektiDatabase } from "../../database/projektiDatabase";
import { IllegalArgumentError } from "../../error/IllegalArgumentError";
import { AbstractHyvaksymisPaatosVaiheTilaManager } from "./abstractHyvaksymisPaatosVaiheTilaManager";
import { aineistoSynchronizerService } from "../../aineisto/aineistoSynchronizerService";
import { PathTuple, ProjektiPaths } from "../../files/ProjektiPath";
import assert from "assert";
import { projektiAdapter } from "../../projekti/adapter/projektiAdapter";
import { ProjektiAineistoManager } from "../../aineisto/projektiAineistoManager";
import { requireAdmin, requireOmistaja, requirePermissionMuokkaa } from "../../user/userService";

async function cleanupKuulutusAfterApproval(projekti: DBProjekti, hyvaksymisPaatosVaihe: HyvaksymisPaatosVaihe) {
  if (hyvaksymisPaatosVaihe.palautusSyy || hyvaksymisPaatosVaihe.uudelleenKuulutus) {
    if (hyvaksymisPaatosVaihe.palautusSyy) {
      hyvaksymisPaatosVaihe.palautusSyy = null;
    }
    if (hyvaksymisPaatosVaihe.uudelleenKuulutus) {
      hyvaksymisPaatosVaihe.uudelleenKuulutus = null;
    }
    await projektiDatabase.saveProjekti({ oid: projekti.oid, versio: projekti.versio, hyvaksymisPaatosVaihe });
  }
}
class HyvaksymisPaatosVaiheTilaManager extends AbstractHyvaksymisPaatosVaiheTilaManager {
  validateSendForApproval(projekti: DBProjekti): void {
    if (!new ProjektiAineistoManager(projekti).getHyvaksymisPaatosVaihe().isReady()) {
      throw new IllegalArgumentError("Projektia ei voi lähettää hyväksyttäväksi ennen kuin aineistot on tuotu. Yritän hetken päästä uudelleen.");
    }
  }
  getVaihe(projekti: DBProjekti): HyvaksymisPaatosVaihe {
    const hyvaksymisPaatosVaihe = projekti.hyvaksymisPaatosVaihe;
    if (!hyvaksymisPaatosVaihe) {
      throw new Error("Projektilla ei ole hyvaksymisPaatosVaihetta");
    }
    return hyvaksymisPaatosVaihe;
  }

  getJulkaisut(projekti: DBProjekti): HyvaksymisPaatosVaiheJulkaisu[] | undefined {
    return projekti.hyvaksymisPaatosVaiheJulkaisut || undefined;
  }

  validateUudelleenkuulutus(
    projekti: DBProjekti,
    kuulutus: HyvaksymisPaatosVaihe,
    hyvaksyttyJulkaisu: HyvaksymisPaatosVaiheJulkaisu | undefined
  ): void {
    // Tarkista, että on olemassa hyväksytty julkaisu, jonka perua
    if (!hyvaksyttyJulkaisu) {
      throw new IllegalArgumentError("Ei ole olemassa kuulutusta, jota uudelleenkuuluttaa");
    }
    // Hyväksymisvaiheen uudelleenkuuluttaminen on mahdollista vain jos jatkopäätös1kuulutusjulkaisua ei ole
    const apiProjekti = projektiAdapter.adaptProjekti(projekti);
    const isJatkoPaatosPresent = !!apiProjekti.jatkoPaatos1VaiheJulkaisu;
    if (isJatkoPaatosPresent) {
      throw new IllegalArgumentError(
        "Et voi uudelleenkuuluttaa hyväksymispäätöskuulutusta sillä jatkopäätöskuulutus on jo hyväksytty tai se on hyväksyttävänä"
      );
    }
    assert(kuulutus, "Projektilla pitäisi olla hyväksymispäätöskuulutus, jos sitä uudelleenkuulutetaan");
    // Uudelleenkuulutus ei ole mahdollista jos uudelleenkuulutus on jo olemassa
    if (kuulutus.uudelleenKuulutus) {
      throw new IllegalArgumentError("Et voi uudelleenkuuluttaa hyväksymispäätöskuulutusta, koska uudelleenkuulutus on jo olemassa");
    }
  }

  getProjektiPathForKuulutus(projekti: DBProjekti, kuulutus: HyvaksymisPaatosVaihe | null | undefined): PathTuple {
    return new ProjektiPaths(projekti.oid).hyvaksymisPaatosVaihe(kuulutus);
  }

  async saveVaihe(projekti: DBProjekti, hyvaksymisPaatosVaihe: HyvaksymisPaatosVaihe): Promise<void> {
    await projektiDatabase.saveProjekti({ oid: projekti.oid, versio: projekti.versio, hyvaksymisPaatosVaihe });
  }

  checkPriviledgesApproveReject(projekti: DBProjekti): NykyinenKayttaja {
    const projektiPaallikko = requireOmistaja(projekti);
    return projektiPaallikko;
  }

  checkPriviledgesSendForApproval(projekti: DBProjekti): NykyinenKayttaja {
    const muokkaaja = requirePermissionMuokkaa(projekti);
    return muokkaaja;
  }

  checkUudelleenkuulutusPriviledges(_projekti: DBProjekti): NykyinenKayttaja {
    return requireAdmin();
  }

  async sendForApproval(projekti: DBProjekti, muokkaaja: NykyinenKayttaja): Promise<void> {
    const julkaisuWaitingForApproval = asiakirjaAdapter.findHyvaksymisPaatosVaiheWaitingForApproval(projekti);
    if (julkaisuWaitingForApproval) {
      throw new Error("HyvaksymisPaatosVaihe on jo olemassa odottamassa hyväksyntää");
    }

    await this.removeRejectionReasonIfExists(projekti, "hyvaksymisPaatosVaihe", this.getVaihe(projekti));

    const julkaisu = asiakirjaAdapter.adaptHyvaksymisPaatosVaiheJulkaisu(projekti, this.getVaihe(projekti));
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
    const hyvaksymisPaatosVaihe = this.getVaihe(projekti);
    const julkaisu = asiakirjaAdapter.findHyvaksymisPaatosVaiheWaitingForApproval(projekti);
    if (!julkaisu) {
      throw new Error("Ei hyvaksymisPaatosVaihetta odottamassa hyväksyntää");
    }
    await cleanupKuulutusAfterApproval(projekti, hyvaksymisPaatosVaihe);

    julkaisu.tila = KuulutusJulkaisuTila.HYVAKSYTTY;
    julkaisu.hyvaksyja = projektiPaallikko.uid;

    await projektiDatabase.saveProjekti({
      oid: projekti.oid,
      versio: projekti.versio,
      ajastettuTarkistus: this.getNextAjastettuTarkistus(julkaisu, true),
    });

    await projektiDatabase.hyvaksymisPaatosVaiheJulkaisut.update(projekti, julkaisu);
    await aineistoSynchronizerService.synchronizeProjektiFiles(projekti.oid);
  }

  async reject(projekti: DBProjekti, syy: string): Promise<void> {
    const julkaisu = asiakirjaAdapter.findHyvaksymisPaatosVaiheWaitingForApproval(projekti);
    if (!julkaisu) {
      throw new Error("Ei hyvaksymisPaatosVaihetta odottamassa hyväksyntää");
    }

    const hyvaksymisPaatosVaihe = this.getVaihe(projekti);
    hyvaksymisPaatosVaihe.palautusSyy = syy;
    hyvaksymisPaatosVaihe.id = hyvaksymisPaatosVaihe.id - 1;
    if (!julkaisu.hyvaksymisPaatosVaihePDFt) {
      throw new Error("julkaisu.hyvaksymisPaatosVaihePDFt puuttuu");
    }
    await this.deletePDFs(projekti.oid, julkaisu.hyvaksymisPaatosVaihePDFt);

    await projektiDatabase.saveProjekti({ oid: projekti.oid, versio: projekti.versio, hyvaksymisPaatosVaihe });
    await projektiDatabase.hyvaksymisPaatosVaiheJulkaisut.delete(projekti, julkaisu.id);
  }
}

export const hyvaksymisPaatosVaiheTilaManager = new HyvaksymisPaatosVaiheTilaManager();
