import { KuulutusJulkaisuTila, NykyinenKayttaja, TilasiirtymaTyyppi, Vaihe } from "hassu-common/graphql/apiModel";
import { DBProjekti, HyvaksymisPaatosVaihe, JatkoPaatos2VaiheJulkaisu } from "../../database/model";
import { asiakirjaAdapter } from "../asiakirjaAdapter";
import { projektiDatabase } from "../../database/projektiDatabase";
import { IllegalAineistoStateError, IllegalArgumentError } from "hassu-common/error";
import { AbstractHyvaksymisPaatosVaiheTilaManager } from "./abstractHyvaksymisPaatosVaiheTilaManager";
import { PathTuple, ProjektiPaths } from "../../files/ProjektiPath";
import { assertIsDefined } from "../../util/assertions";
import assert from "assert";
import { ProjektiTiedostoManager, VaiheTiedostoManager } from "../../tiedostot/ProjektiTiedostoManager";
import { requireAdmin, requireOmistaja, requirePermissionMuokkaa } from "../../user/userService";
import { sendJatkoPaatos2KuulutusApprovalMailsAndAttachments } from "../email/emailHandler";
import { findJatkoPaatos2VaiheWaitingForApproval } from "../../projekti/projektiUtil";
import { PaatosTyyppi } from "hassu-common/hyvaksymisPaatosUtil";
import { approvalEmailSender } from "../email/approvalEmailSender";
import { projektiEntityDatabase } from "../../database/projektiEntityDatabase";

class JatkoPaatos2VaiheTilaManager extends AbstractHyvaksymisPaatosVaiheTilaManager<JatkoPaatos2VaiheJulkaisu> {
  constructor() {
    super(Vaihe.JATKOPAATOS2);
  }
  getVaihePathname(): string {
    return ProjektiPaths.PATH_JATKOPAATOS2;
  }
  async sendApprovalMailsAndAttachments(oid: string): Promise<void> {
    await sendJatkoPaatos2KuulutusApprovalMailsAndAttachments(oid);
  }

  async updateJulkaisu(_projekti: DBProjekti, julkaisu: JatkoPaatos2VaiheJulkaisu): Promise<void> {
    await projektiEntityDatabase.put(julkaisu);
  }

  getKuulutusWaitingForApproval(projekti: DBProjekti): JatkoPaatos2VaiheJulkaisu | undefined {
    return findJatkoPaatos2VaiheWaitingForApproval(projekti);
  }

  async rejectAndPeruAineistoMuokkaus(projekti: DBProjekti, syy: string): Promise<void> {
    const julkaisuWaitingForApproval = findJatkoPaatos2VaiheWaitingForApproval(projekti);
    if (julkaisuWaitingForApproval && julkaisuWaitingForApproval.aineistoMuokkaus) {
      projekti = await this.rejectJulkaisu(projekti, julkaisuWaitingForApproval, syy);
    }
    await this.peruAineistoMuokkaus(projekti);
  }

  getUpdatedAineistotForVaihe(
    hyvaksymisPaatosVaihe: HyvaksymisPaatosVaihe,
    id: number,
    paths: ProjektiPaths
  ): Pick<HyvaksymisPaatosVaihe, "aineistoNahtavilla" | "hyvaksymisPaatos" | "alkuperainenPaatos" | "hyvaksymisPaatosVaiheSaamePDFt"> {
    const oldPathPrefix = paths.jatkoPaatos2Vaihe(hyvaksymisPaatosVaihe).yllapitoPath;

    const newPathPrefix = paths.jatkoPaatos2Vaihe({ ...hyvaksymisPaatosVaihe, id }).yllapitoPath;

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
    const vaihe = projekti.jatkoPaatos2Vaihe;
    assertIsDefined(vaihe, "Projektilla ei ole jatkoPaatos2Vaihetta");
    return vaihe;
  }

  getVaiheAineisto(projekti: DBProjekti): VaiheTiedostoManager<HyvaksymisPaatosVaihe, JatkoPaatos2VaiheJulkaisu> {
    return new ProjektiTiedostoManager(projekti).getJatkoPaatos2Vaihe();
  }

  getJulkaisut(projekti: DBProjekti): JatkoPaatos2VaiheJulkaisu[] | undefined {
    return projekti.jatkoPaatos2VaiheJulkaisut ?? undefined;
  }

  async validateUudelleenkuulutus(
    _projekti: DBProjekti,
    kuulutus: HyvaksymisPaatosVaihe,
    hyvaksyttyJulkaisu: JatkoPaatos2VaiheJulkaisu | undefined
  ): Promise<void> {
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

  validatePalaa(_projekti: DBProjekti) {
    throw new IllegalArgumentError("Et voi siirtyä taaksepäin projektin nykytilassa");
  }

  getProjektiPathForKuulutus(projekti: DBProjekti, kuulutus: HyvaksymisPaatosVaihe | null | undefined): PathTuple {
    return new ProjektiPaths(projekti.oid).jatkoPaatos2Vaihe(kuulutus);
  }

  async saveVaihe(projekti: DBProjekti, jatkoPaatos2Vaihe: HyvaksymisPaatosVaihe): Promise<void> {
    await projektiDatabase.saveProjekti({ oid: projekti.oid, versio: projekti.versio, jatkoPaatos2Vaihe });
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
    const julkaisuWaitingForApproval = findJatkoPaatos2VaiheWaitingForApproval(projekti);
    if (julkaisuWaitingForApproval) {
      throw new Error("JatkoPaatos2Vaihe on jo olemassa odottamassa hyväksyntää");
    }

    await this.removeRejectionReasonIfExists(projekti, "jatkoPaatos2Vaihe", this.getVaihe(projekti));

    const julkaisu = await asiakirjaAdapter.adaptJatkoPaatos2VaiheJulkaisu(
      projekti,
      projekti.jatkoPaatos2Vaihe,
      projekti.jatkoPaatos2VaiheJulkaisut
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
      new ProjektiPaths(projekti.oid).jatkoPaatos2Vaihe(julkaisu),
      PaatosTyyppi.JATKOPAATOS2
    );

    await projektiEntityDatabase.put(julkaisu);
    const updatedProjekti = await projektiDatabase.loadProjektiByOid(projekti.oid);
    if (!updatedProjekti) {
      throw new Error("Projektia oid:lla ${projekti.oid)} ei löydy");
    }
    await approvalEmailSender.sendEmails(updatedProjekti, tilasiirtymaTyyppi);
  }

  async reject(projekti: DBProjekti, syy: string): Promise<void> {
    const julkaisu = findJatkoPaatos2VaiheWaitingForApproval(projekti);
    if (!julkaisu) {
      throw new Error("Ei jatkoPaatos2Vaihetta odottamassa hyväksyntää");
    }
    projekti = await this.rejectJulkaisu(projekti, julkaisu, syy);
    await projektiDatabase.saveProjekti({ oid: projekti.oid, versio: projekti.versio, jatkoPaatos2Vaihe: projekti.jatkoPaatos2Vaihe });
  }

  async rejectJulkaisu(projekti: DBProjekti, julkaisu: JatkoPaatos2VaiheJulkaisu, syy: string): Promise<DBProjekti> {
    const jatkoPaatos2Vaihe = this.getVaihe(projekti);
    jatkoPaatos2Vaihe.palautusSyy = syy;
    if (!julkaisu.hyvaksymisPaatosVaihePDFt) {
      throw new Error("julkaisu.hyvaksymisPaatosVaihePDFt puuttuu");
    }
    await this.deletePDFs(projekti.oid, julkaisu.hyvaksymisPaatosVaihePDFt);

    await projektiEntityDatabase.delete(julkaisu);
    return {
      ...projekti,
      jatkoPaatos2Vaihe,
      jatkoPaatos2VaiheJulkaisut: projekti.jatkoPaatos2VaiheJulkaisut?.filter((j) => julkaisu.id != j.id),
    };
  }
}

export const jatkoPaatos2VaiheTilaManager = new JatkoPaatos2VaiheTilaManager();
