import { KuulutusJulkaisuTila, NykyinenKayttaja, TilasiirtymaTyyppi, Vaihe } from "hassu-common/graphql/apiModel";
import { DBProjekti, HyvaksymisPaatosVaihe, HyvaksymisPaatosVaiheJulkaisu } from "../../database/model";
import { asiakirjaAdapter } from "../asiakirjaAdapter";
import { projektiDatabase } from "../../database/projektiDatabase";
import { IllegalAineistoStateError, IllegalArgumentError } from "hassu-common/error";
import { AbstractHyvaksymisPaatosVaiheTilaManager } from "./abstractHyvaksymisPaatosVaiheTilaManager";
import { PathTuple, ProjektiPaths } from "../../files/ProjektiPath";
import { assertIsDefined } from "../../util/assertions";
import { projektiAdapter } from "../../projekti/adapter/projektiAdapter";
import assert from "assert";
import { ProjektiTiedostoManager, VaiheTiedostoManager } from "../../tiedostot/ProjektiTiedostoManager";
import { requireAdmin, requireOmistaja, requirePermissionMuokkaa } from "../../user/userService";
import { sendJatkopaatos1KuulutusApprovalMailsAndAttachments } from "../email/emailHandler";
import { findJatkoPaatos1VaiheWaitingForApproval } from "../../projekti/projektiUtil";
import { PaatosTyyppi } from "hassu-common/hyvaksymisPaatosUtil";
import { approvalEmailSender } from "../email/approvalEmailSender";

class JatkoPaatos1VaiheTilaManager extends AbstractHyvaksymisPaatosVaiheTilaManager {
  constructor() {
    super(Vaihe.JATKOPAATOS);
  }
  getVaihePathname(): string {
    return ProjektiPaths.PATH_JATKOPAATOS1;
  }
  async sendApprovalMailsAndAttachments(oid: string): Promise<void> {
    await sendJatkopaatos1KuulutusApprovalMailsAndAttachments(oid);
  }

  async updateJulkaisu(projekti: DBProjekti, julkaisu: HyvaksymisPaatosVaiheJulkaisu): Promise<void> {
    await projektiDatabase.jatkoPaatos1VaiheJulkaisut.update(projekti, julkaisu);
  }

  getKuulutusWaitingForApproval(projekti: DBProjekti): HyvaksymisPaatosVaiheJulkaisu | undefined {
    return findJatkoPaatos1VaiheWaitingForApproval(projekti);
  }

  getUpdatedAineistotForVaihe(
    hyvaksymisPaatosVaihe: HyvaksymisPaatosVaihe,
    id: number,
    paths: ProjektiPaths
  ): Pick<HyvaksymisPaatosVaihe, "aineistoNahtavilla" | "hyvaksymisPaatos" | "alkuperainenPaatos" | "hyvaksymisPaatosVaiheSaamePDFt"> {
    const oldPathPrefix = paths.jatkoPaatos1Vaihe(hyvaksymisPaatosVaihe).yllapitoPath;

    const newPathPrefix = paths.jatkoPaatos1Vaihe({ ...hyvaksymisPaatosVaihe, id }).yllapitoPath;

    const aineistoNahtavilla = this.updateAineistoArrayForUudelleenkuulutus(
      hyvaksymisPaatosVaihe.aineistoNahtavilla,
      oldPathPrefix,
      newPathPrefix
    );

    const hyvaksymisPaatos = this.updateAineistoArrayForUudelleenkuulutus(
      hyvaksymisPaatosVaihe.hyvaksymisPaatos,
      oldPathPrefix,
      newPathPrefix
    );

    const alkuperainenPaatos = this.updateAineistoArrayForUudelleenkuulutus(
      hyvaksymisPaatosVaihe.alkuperainenPaatos,
      oldPathPrefix,
      newPathPrefix
    );

    const hyvaksymisPaatosVaiheSaamePDFt = this.updateKuulutusSaamePDFtForUudelleenkuulutus(
      hyvaksymisPaatosVaihe.hyvaksymisPaatosVaiheSaamePDFt,
      oldPathPrefix,
      newPathPrefix
    );

    return { aineistoNahtavilla, hyvaksymisPaatos, alkuperainenPaatos, hyvaksymisPaatosVaiheSaamePDFt };
  }

  async validateSendForApproval(projekti: DBProjekti): Promise<void> {
    const vaihe = this.getVaihe(projekti);
    this.validateSaamePDFsExistIfRequired(projekti.kielitiedot?.toissijainenKieli, vaihe.hyvaksymisPaatosVaiheSaamePDFt);

    if (!this.getVaiheAineisto(projekti).isReady()) {
      throw new IllegalAineistoStateError();
    }
  }

  getVaihe(projekti: DBProjekti): HyvaksymisPaatosVaihe {
    const vaihe = projekti.jatkoPaatos1Vaihe;
    assertIsDefined(vaihe, "Projektilla ei ole jatkoPaatos1Vaihetta");
    return vaihe;
  }

  getVaiheAineisto(projekti: DBProjekti): VaiheTiedostoManager<HyvaksymisPaatosVaihe, HyvaksymisPaatosVaiheJulkaisu> {
    return new ProjektiTiedostoManager(projekti).getJatkoPaatos1Vaihe();
  }

  getJulkaisut(projekti: DBProjekti): HyvaksymisPaatosVaiheJulkaisu[] | undefined {
    return projekti.jatkoPaatos1VaiheJulkaisut ?? undefined;
  }

  async validateUudelleenkuulutus(
    projekti: DBProjekti,
    kuulutus: HyvaksymisPaatosVaihe,
    hyvaksyttyJulkaisu: HyvaksymisPaatosVaiheJulkaisu | undefined
  ): Promise<void> {
    // Tarkista, että on olemassa hyväksytty julkaisu, jonka perua
    if (!hyvaksyttyJulkaisu) {
      throw new IllegalArgumentError("Ei ole olemassa kuulutusta, jota uudelleenkuuluttaa");
    }
    // Jatkopäätös1Vaiheen uudelleenkuuluttaminen on mahdollista vain jos JatkoPaatos2VaiheJulkaisua ei ole
    const apiProjekti = await projektiAdapter.adaptProjekti(projekti, undefined, false);
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

  validatePalaa(_projekti: DBProjekti) {
    throw new IllegalArgumentError("Et voi siirtyä taaksepäin projektin nykytilassa");
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

  async sendForApproval(projekti: DBProjekti, muokkaaja: NykyinenKayttaja, tilasiirtymaTyyppi: TilasiirtymaTyyppi): Promise<void> {
    const julkaisuWaitingForApproval = findJatkoPaatos1VaiheWaitingForApproval(projekti);
    if (julkaisuWaitingForApproval) {
      throw new Error("JatkoPaatos1Vaihe on jo olemassa odottamassa hyväksyntää");
    }

    await this.removeRejectionReasonIfExists(projekti, "jatkoPaatos1Vaihe", this.getVaihe(projekti));

    const julkaisu = await asiakirjaAdapter.adaptHyvaksymisPaatosVaiheJulkaisu(
      projekti,
      this.getVaihe(projekti),
      this.getJulkaisut(projekti)
    );
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
      new ProjektiPaths(projekti.oid).jatkoPaatos1Vaihe(julkaisu),
      PaatosTyyppi.JATKOPAATOS1
    );

    await projektiDatabase.jatkoPaatos1VaiheJulkaisut.insert(projekti.oid, julkaisu);
    const updatedProjekti = await projektiDatabase.loadProjektiByOid(projekti.oid);
    if (!updatedProjekti) {
      throw new Error("Projektia oid:lla ${projekti.oid)} ei löydy");
    }
    await approvalEmailSender.sendEmails(updatedProjekti, tilasiirtymaTyyppi);
  }

  async reject(projekti: DBProjekti, syy: string): Promise<void> {
    const julkaisu = findJatkoPaatos1VaiheWaitingForApproval(projekti);
    if (!julkaisu) {
      throw new Error("Ei jatkoPaatos1Vaihetta odottamassa hyväksyntää");
    }
    projekti = await this.rejectJulkaisu(projekti, julkaisu, syy);
    await projektiDatabase.saveProjekti({ oid: projekti.oid, versio: projekti.versio, jatkoPaatos1Vaihe: projekti.jatkoPaatos1Vaihe });
  }

  async rejectJulkaisu(projekti: DBProjekti, julkaisu: HyvaksymisPaatosVaiheJulkaisu, syy: string): Promise<DBProjekti> {
    const jatkoPaatos1Vaihe = this.getVaihe(projekti);
    jatkoPaatos1Vaihe.palautusSyy = syy;
    if (!julkaisu.hyvaksymisPaatosVaihePDFt) {
      throw new Error("julkaisu.hyvaksymisPaatosVaihePDFt puuttuu");
    }
    await this.deletePDFs(projekti.oid, julkaisu.hyvaksymisPaatosVaihePDFt);

    await projektiDatabase.jatkoPaatos1VaiheJulkaisut.delete(projekti, julkaisu.id);
    return {
      ...projekti,
      jatkoPaatos1Vaihe,
      jatkoPaatos1VaiheJulkaisut: projekti.jatkoPaatos1VaiheJulkaisut?.filter((j) => julkaisu.id != j.id),
    };
  }
}

export const jatkoPaatos1VaiheTilaManager = new JatkoPaatos1VaiheTilaManager();
