import { KuulutusJulkaisuTila, NykyinenKayttaja, TilasiirtymaTyyppi, Vaihe } from "hassu-common/graphql/apiModel";
import { DBProjekti, HyvaksymisPaatosVaihe, HyvaksymisPaatosVaiheJulkaisu } from "../../database/model";
import { asiakirjaAdapter } from "../asiakirjaAdapter";
import { projektiDatabase } from "../../database/projektiDatabase";
import { IllegalArgumentError } from "hassu-common/error";
import { AbstractHyvaksymisPaatosVaiheTilaManager } from "./abstractHyvaksymisPaatosVaiheTilaManager";
import { SisainenProjektiPaths, PathTuple, ProjektiPaths } from "../../files/ProjektiPath";
import assert from "assert";
import { projektiAdapter } from "../../projekti/adapter/projektiAdapter";
import { ProjektiTiedostoManager, VaiheTiedostoManager } from "../../tiedostot/ProjektiTiedostoManager";
import { requireAdmin, requireOmistaja, requirePermissionMuokkaa } from "../../user/userService";
import { IllegalAineistoStateError } from "hassu-common/error/IllegalAineistoStateError";
import { sendHyvaksymiskuulutusApprovalMailsAndAttachments } from "../email/emailHandler";
import { findHyvaksymisPaatosVaiheWaitingForApproval } from "../../projekti/projektiUtil";
import { PaatosTyyppi } from "hassu-common/hyvaksymisPaatosUtil";
import { approvalEmailSender } from "../email/approvalEmailSender";
import { tallennaMaanomistajaluettelo } from "../../mml/tiedotettavatExcel";
import { fileService } from "../../files/fileService";
import { log } from "../../logger";
import { parameters } from "../../aws/parameters";

class HyvaksymisPaatosVaiheTilaManager extends AbstractHyvaksymisPaatosVaiheTilaManager {
  constructor() {
    super(Vaihe.HYVAKSYMISPAATOS);
  }
  getVaihePathname(): string {
    return ProjektiPaths.PATH_HYVAKSYMISPAATOS;
  }
  async sendApprovalMailsAndAttachments(oid: string): Promise<void> {
    await sendHyvaksymiskuulutusApprovalMailsAndAttachments(oid);
  }

  async updateJulkaisu(projekti: DBProjekti, julkaisu: HyvaksymisPaatosVaiheJulkaisu): Promise<void> {
    await projektiDatabase.hyvaksymisPaatosVaiheJulkaisut.update(projekti, julkaisu);
  }

  getKuulutusWaitingForApproval(projekti: DBProjekti): HyvaksymisPaatosVaiheJulkaisu | undefined {
    return findHyvaksymisPaatosVaiheWaitingForApproval(projekti);
  }

  getUpdatedAineistotForVaihe(
    hyvaksymisPaatosVaihe: HyvaksymisPaatosVaihe,
    id: number,
    paths: ProjektiPaths
  ): Pick<HyvaksymisPaatosVaihe, "aineistoNahtavilla" | "hyvaksymisPaatos" | "hyvaksymisPaatosVaiheSaamePDFt"> {
    const oldPathPrefix = paths.hyvaksymisPaatosVaihe(hyvaksymisPaatosVaihe).yllapitoPath;
    const newPathPrefix = paths.hyvaksymisPaatosVaihe({ ...hyvaksymisPaatosVaihe, id }).yllapitoPath;

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

    const hyvaksymisPaatosVaiheSaamePDFt = this.updateKuulutusSaamePDFtForUudelleenkuulutus(
      hyvaksymisPaatosVaihe.hyvaksymisPaatosVaiheSaamePDFt,
      oldPathPrefix,
      newPathPrefix
    );

    return { aineistoNahtavilla, hyvaksymisPaatos, hyvaksymisPaatosVaiheSaamePDFt };
  }

  validateSendForApproval(projekti: DBProjekti): void {
    const vaihe = this.getVaihe(projekti);
    this.validateSaamePDFsExistIfRequired(projekti.kielitiedot?.toissijainenKieli, vaihe?.hyvaksymisPaatosVaiheSaamePDFt);

    if (!this.getVaiheAineisto(projekti).isReady()) {
      throw new IllegalAineistoStateError();
    }
  }

  getVaihe(projekti: DBProjekti): HyvaksymisPaatosVaihe {
    const hyvaksymisPaatosVaihe = projekti.hyvaksymisPaatosVaihe;
    if (!hyvaksymisPaatosVaihe) {
      throw new Error("Projektilla ei ole hyvaksymisPaatosVaihetta");
    }
    return hyvaksymisPaatosVaihe;
  }

  getVaiheAineisto(projekti: DBProjekti): VaiheTiedostoManager<HyvaksymisPaatosVaihe, HyvaksymisPaatosVaiheJulkaisu> {
    return new ProjektiTiedostoManager(projekti).getHyvaksymisPaatosVaihe();
  }

  getJulkaisut(projekti: DBProjekti): HyvaksymisPaatosVaiheJulkaisu[] | undefined {
    return projekti.hyvaksymisPaatosVaiheJulkaisut ?? undefined;
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
    // Hyväksymisvaiheen uudelleenkuuluttaminen on mahdollista vain jos jatkopäätös1kuulutusjulkaisua ei ole
    const apiProjekti = await projektiAdapter.adaptProjekti(projekti, undefined, false);
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

  validatePalaa(_projekti: DBProjekti) {
    throw new IllegalArgumentError("Et voi siirtyä taaksepäin projektin nykytilassa");
  }

  getProjektiPathForKuulutus(projekti: DBProjekti, kuulutus: HyvaksymisPaatosVaihe | null | undefined): PathTuple {
    return new ProjektiPaths(projekti.oid).hyvaksymisPaatosVaihe(kuulutus);
  }

  async saveVaihe(projekti: DBProjekti, hyvaksymisPaatosVaihe: HyvaksymisPaatosVaihe): Promise<void> {
    await projektiDatabase.saveProjekti({ oid: projekti.oid, versio: projekti.versio, hyvaksymisPaatosVaihe });
  }

  checkPriviledgesApproveReject(projekti: DBProjekti): NykyinenKayttaja {
    return requireOmistaja(projekti, "hyväksy tai hylkää HyvaksymisPaatosVaihe");
  }

  checkPriviledgesSendForApproval(projekti: DBProjekti): NykyinenKayttaja {
    return requirePermissionMuokkaa(projekti);
  }

  checkUudelleenkuulutusPriviledges(_projekti: DBProjekti): NykyinenKayttaja {
    return requireAdmin();
  }

  async sendForApproval(projekti: DBProjekti, muokkaaja: NykyinenKayttaja, tilasiirtymaTyyppi: TilasiirtymaTyyppi): Promise<void> {
    const julkaisuWaitingForApproval = findHyvaksymisPaatosVaiheWaitingForApproval(projekti);
    if (julkaisuWaitingForApproval) {
      throw new Error("HyvaksymisPaatosVaihe on jo olemassa odottamassa hyväksyntää");
    }

    await this.removeRejectionReasonIfExists(projekti, "hyvaksymisPaatosVaihe", this.getVaihe(projekti));

    const julkaisu = await asiakirjaAdapter.adaptHyvaksymisPaatosVaiheJulkaisu(projekti, this.getVaihe(projekti));
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
      new ProjektiPaths(projekti.oid).hyvaksymisPaatosVaihe(julkaisu),
      PaatosTyyppi.HYVAKSYMISPAATOS
    );

    julkaisu.maanomistajaluettelo = await tallennaMaanomistajaluettelo(
      projekti,
      new SisainenProjektiPaths(projekti.oid).hyvaksymisPaatosVaihe(julkaisu),
      this.vaihe,
      julkaisu.kuulutusPaiva,
      julkaisu.id
    );

    await projektiDatabase.hyvaksymisPaatosVaiheJulkaisut.insert(projekti.oid, julkaisu);
    const updatedProjekti = await projektiDatabase.loadProjektiByOid(projekti.oid);
    if (!updatedProjekti) {
      throw new Error("Projektia oid:lla ${projekti.oid)} ei löydy");
    }
    await approvalEmailSender.sendEmails(updatedProjekti, tilasiirtymaTyyppi);
  }

  async reject(projekti: DBProjekti, syy: string): Promise<void> {
    const julkaisu = findHyvaksymisPaatosVaiheWaitingForApproval(projekti);
    if (!julkaisu) {
      throw new Error("Ei hyvaksymisPaatosVaihetta odottamassa hyväksyntää");
    }
    projekti = await this.rejectJulkaisu(projekti, julkaisu, syy);
    await projektiDatabase.saveProjekti({
      oid: projekti.oid,
      versio: projekti.versio,
      hyvaksymisPaatosVaihe: projekti.hyvaksymisPaatosVaihe,
    });
  }

  async rejectJulkaisu(projekti: DBProjekti, julkaisu: HyvaksymisPaatosVaiheJulkaisu, syy: string): Promise<DBProjekti> {
    const hyvaksymisPaatosVaihe = this.getVaihe(projekti);
    hyvaksymisPaatosVaihe.palautusSyy = syy;
    if (!julkaisu.hyvaksymisPaatosVaihePDFt) {
      throw new Error("julkaisu.hyvaksymisPaatosVaihePDFt puuttuu");
    }
    await this.deletePDFs(projekti.oid, julkaisu.hyvaksymisPaatosVaihePDFt);

    if (julkaisu.maanomistajaluettelo) {
      await fileService.deleteYllapitoSisainenFileFromProjekti({
        oid: projekti.oid,
        filePathInProjekti: julkaisu.maanomistajaluettelo,
        reason: "Hyväksymispäätösvaihe rejected",
      });
    }
    await projektiDatabase.hyvaksymisPaatosVaiheJulkaisut.delete(projekti, julkaisu.id);
    return {
      ...projekti,
      hyvaksymisPaatosVaihe,
      hyvaksymisPaatosVaiheJulkaisut: projekti.jatkoPaatos1VaiheJulkaisut?.filter((j) => julkaisu.id != j.id),
    };
  }

  async approve(projekti: DBProjekti, hyvaksyja: NykyinenKayttaja): Promise<void> {
    const suomifiViestitEnabled = await parameters.isSuomiFiViestitIntegrationEnabled();
    if (suomifiViestitEnabled && !projekti.omistajahakuStatus) {
      const msg = "Kiinteistönomistajia ei ole haettu ennen hyväksymispäätöksen hyväksyntää";
      log.error(msg);
      throw new Error(msg);
    }
    await super.approve(projekti, hyvaksyja);
  }
}

export const hyvaksymisPaatosVaiheTilaManager = new HyvaksymisPaatosVaiheTilaManager();
