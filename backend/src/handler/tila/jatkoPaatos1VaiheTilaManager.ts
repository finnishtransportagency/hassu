import { KuulutusJulkaisuTila, NykyinenKayttaja } from "../../../../common/graphql/apiModel";
import { DBProjekti, HyvaksymisPaatosVaihe, HyvaksymisPaatosVaiheJulkaisu } from "../../database/model";
import { asiakirjaAdapter } from "../asiakirjaAdapter";
import { projektiDatabase } from "../../database/projektiDatabase";
import { IllegalArgumentError } from "../../error/IllegalArgumentError";
import { AbstractHyvaksymisPaatosVaiheTilaManager } from "./abstractHyvaksymisPaatosVaiheTilaManager";
import { PathTuple, ProjektiPaths } from "../../files/ProjektiPath";
import { assertIsDefined } from "../../util/assertions";
import { projektiAdapter } from "../../projekti/adapter/projektiAdapter";
import assert from "assert";
import { ProjektiAineistoManager } from "../../aineisto/projektiAineistoManager";
import { requireAdmin, requireOmistaja, requirePermissionMuokkaa } from "../../user/userService";
import { IllegalAineistoStateError } from "../../error/IllegalAineistoStateError";

async function cleanupKuulutusAfterApproval(projekti: DBProjekti, jatkoPaatos1Vaihe: HyvaksymisPaatosVaihe) {
  if (jatkoPaatos1Vaihe.palautusSyy || jatkoPaatos1Vaihe.uudelleenKuulutus) {
    if (jatkoPaatos1Vaihe.palautusSyy) {
      jatkoPaatos1Vaihe.palautusSyy = null;
    }
    if (jatkoPaatos1Vaihe.uudelleenKuulutus) {
      jatkoPaatos1Vaihe.uudelleenKuulutus = null;
    }
    await projektiDatabase.saveProjekti({ oid: projekti.oid, versio: projekti.versio, jatkoPaatos1Vaihe });
  }
}

class JatkoPaatos1VaiheTilaManager extends AbstractHyvaksymisPaatosVaiheTilaManager {
  validateSendForApproval(projekti: DBProjekti): void {
    if (!new ProjektiAineistoManager(projekti).getJatkoPaatos1Vaihe().isReady()) {
      throw new IllegalAineistoStateError();
    }
  }

  getVaihe(projekti: DBProjekti): HyvaksymisPaatosVaihe {
    const vaihe = projekti.jatkoPaatos1Vaihe;
    assertIsDefined(vaihe, "Projektilla ei ole jatkoPaatos1Vaihetta");
    return vaihe;
  }

  getJulkaisut(projekti: DBProjekti): HyvaksymisPaatosVaiheJulkaisu[] | undefined {
    return projekti.jatkoPaatos1VaiheJulkaisut || undefined;
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
    // Jatkopäätös1Vaiheen uudelleenkuuluttaminen on mahdollista vain jos JatkoPaatos2VaiheJulkaisua ei ole
    const apiProjekti = projektiAdapter.adaptProjekti(projekti);
    const isJatkoPaatos2Present = !!apiProjekti.jatkoPaatos2VaiheJulkaisu;
    if (isJatkoPaatos2Present) {
      throw new IllegalArgumentError(
        "Et voi uudelleenkuuluttaa jatkopäätös1kuulutusta sillä jatkopäätös2kuulutus on jo hyväksytty tai se on hyväksyttävänä"
      );
    }
    assert(kuulutus, "Projektilla pitäisi olla jatkopäätös1kuulutus, jos sitä uudelleenkuulutetaan");
    // Uudelleenkuulutus ei ole mahdollista jos uudelleenkuulutus on jo olemassa
    if (kuulutus.uudelleenKuulutus) {
      throw new IllegalArgumentError("Et voi uudelleenkuuluttaa jatkopäätös1kuulutusta, koska uudelleenkuulutus on jo olemassa");
    }
  }

  getProjektiPathForKuulutus(projekti: DBProjekti, kuulutus: HyvaksymisPaatosVaihe | null | undefined): PathTuple {
    return new ProjektiPaths(projekti.oid).jatkoPaatos1Vaihe(kuulutus);
  }

  async saveVaihe(projekti: DBProjekti, jatkoPaatos1Vaihe: HyvaksymisPaatosVaihe): Promise<void> {
    await projektiDatabase.saveProjekti({ oid: projekti.oid, versio: projekti.versio, jatkoPaatos1Vaihe });
  }

  checkPriviledgesApproveReject(projekti: DBProjekti): NykyinenKayttaja {
    return requireOmistaja(projekti, "hyväksy tai hylkää 1. jatkopäätös");
  }

  checkPriviledgesSendForApproval(projekti: DBProjekti): NykyinenKayttaja {
    return requirePermissionMuokkaa(projekti);
  }

  checkUudelleenkuulutusPriviledges(_projekti: DBProjekti): NykyinenKayttaja {
    return requireAdmin();
  }

  async sendForApproval(projekti: DBProjekti, muokkaaja: NykyinenKayttaja): Promise<void> {
    const julkaisuWaitingForApproval = asiakirjaAdapter.findJatkoPaatos1VaiheWaitingForApproval(projekti);
    if (julkaisuWaitingForApproval) {
      throw new Error("JatkoPaatos1Vaihe on jo olemassa odottamassa hyväksyntää");
    }

    await this.removeRejectionReasonIfExists(projekti, "jatkoPaatos1Vaihe", this.getVaihe(projekti));

    const julkaisu = asiakirjaAdapter.adaptHyvaksymisPaatosVaiheJulkaisu(projekti, this.getVaihe(projekti));
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
    const hyvaksymisPaatosVaihe = this.getVaihe(projekti);
    const julkaisu = asiakirjaAdapter.findJatkoPaatos1VaiheWaitingForApproval(projekti);
    if (!julkaisu) {
      throw new Error("Ei JatkoPaatos1Vaihetta odottamassa hyväksyntää");
    }
    await cleanupKuulutusAfterApproval(projekti, hyvaksymisPaatosVaihe);
    julkaisu.tila = KuulutusJulkaisuTila.HYVAKSYTTY;
    julkaisu.hyvaksyja = projektiPaallikko.uid;

    await projektiDatabase.saveProjekti({
      oid: projekti.oid,
      versio: projekti.versio,
      ajastettuTarkistus: this.getNextAjastettuTarkistus(julkaisu, false),
    });

    await projektiDatabase.jatkoPaatos1VaiheJulkaisut.update(projekti, julkaisu);
    await this.synchronizeProjektiFiles(projekti.oid, julkaisu.kuulutusPaiva);
  }

  async reject(projekti: DBProjekti, syy: string): Promise<void> {
    const julkaisu = asiakirjaAdapter.findJatkoPaatos1VaiheWaitingForApproval(projekti);
    if (!julkaisu) {
      throw new Error("Ei jatkoPaatos1Vaihetta odottamassa hyväksyntää");
    }

    const jatkoPaatos1Vaihe = this.getVaihe(projekti);
    jatkoPaatos1Vaihe.palautusSyy = syy;
    if (!julkaisu.hyvaksymisPaatosVaihePDFt) {
      throw new Error("julkaisu.hyvaksymisPaatosVaihePDFt puuttuu");
    }
    await this.deletePDFs(projekti.oid, julkaisu.hyvaksymisPaatosVaihePDFt);

    await projektiDatabase.saveProjekti({ oid: projekti.oid, versio: projekti.versio, jatkoPaatos1Vaihe });
    await projektiDatabase.jatkoPaatos1VaiheJulkaisut.delete(projekti, julkaisu.id);
  }
}

export const jatkoPaatos1VaiheTilaManager = new JatkoPaatos1VaiheTilaManager();
