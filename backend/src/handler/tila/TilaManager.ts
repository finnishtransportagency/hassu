import { requirePermissionLuku } from "../../user";
import { projektiDatabase } from "../../database/projektiDatabase";
import { DBProjekti } from "../../database/model";
import { NykyinenKayttaja, TilaSiirtymaInput, TilasiirtymaToiminto, TilasiirtymaTyyppi } from "../../../../common/graphql/apiModel";
import { aineistoSynchronizerService } from "../../aineisto/aineistoSynchronizerService";
import { PathTuple } from "../../files/ProjektiPath";
import { auditLog } from "../../logger";
import { IllegalArgumentError } from "../../error/IllegalArgumentError";
import { GenericVaihe } from "../../projekti/projektiUtil";
import { VaiheAineisto } from "../../aineisto/projektiAineistoManager";
import { asianhallintaService } from "../../asianhallinta/asianhallintaService";
import { assertIsDefined } from "../../util/assertions";

export abstract class TilaManager<T extends GenericVaihe, Y> {
  protected tyyppi!: TilasiirtymaTyyppi;

  abstract getVaihe(projekti: DBProjekti): T;

  abstract getVaiheAineisto(projekti: DBProjekti): VaiheAineisto<T, Y>;

  public async siirraTila({ oid, syy, toiminto, tyyppi }: TilaSiirtymaInput): Promise<void> {
    requirePermissionLuku();
    this.tyyppi = tyyppi;
    const projekti = await projektiDatabase.loadProjektiByOid(oid);
    if (!projekti) {
      throw new Error("Ei voi sirtää projektin tilaa, koska projektia ei löydy");
    }

    if (toiminto == TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI) {
      await this.sendForApprovalInternal(projekti);
    } else if (toiminto == TilasiirtymaToiminto.HYLKAA) {
      if (!syy) {
        throw new Error("Hylkäämiseltä puuttuu syy!");
      }
      await this.rejectInternal(projekti, syy);
    } else if (toiminto == TilasiirtymaToiminto.HYVAKSY) {
      await this.approveInternal(projekti);
    } else if (toiminto == TilasiirtymaToiminto.UUDELLEENKUULUTA) {
      await this.uudelleenkuulutaInternal(projekti);
    } else if (toiminto == TilasiirtymaToiminto.LUO_UUSI_KIERROS) {
      await this.lisaaUusiKierrosInternal(projekti);
    } else {
      throw new Error("Tuntematon toiminto");
    }

    return Promise.resolve(undefined);
  }

  private async lisaaUusiKierrosInternal(projekti: DBProjekti) {
    this.checkPriviledgesLisaaKierros(projekti);
    this.validateLisaaKierros(projekti);
    auditLog.info("Lisaa kierros", { vaihe: this.getVaihe(projekti) });
    await this.lisaaUusiKierros(projekti);
  }

  private async sendForApprovalInternal(projekti: DBProjekti) {
    const kayttaja = this.checkPriviledgesSendForApproval(projekti);
    this.validateSendForApproval(projekti);
    auditLog.info("Lähetä hyväksyttäväksi", { vaihe: this.getVaihe(projekti) });
    this.validateKunnatHasBeenSet(projekti);
    await this.sendForApproval(projekti, kayttaja);
  }

  private async rejectInternal(projekti: DBProjekti, syy: string) {
    this.checkPriviledgesApproveReject(projekti);
    auditLog.info("Hylkää hyväksyntä", { vaihe: this.getVaihe(projekti) });
    await this.reject(projekti, syy);
  }

  private async approveInternal(projekti: DBProjekti) {
    const kayttaja = this.checkPriviledgesApproveReject(projekti);
    auditLog.info("Hyväksy julkaistavaksi:", { vaihe: this.getVaihe(projekti) });
    this.validateKunnatHasBeenSet(projekti);
    await this.approve(projekti, kayttaja);
  }

  private async uudelleenkuulutaInternal(projekti: DBProjekti) {
    this.checkUudelleenkuulutusPriviledges(projekti);
    auditLog.info("Uudelleenkuuluta", { vaihe: this.getVaihe(projekti) });
    await this.uudelleenkuuluta(projekti);
  }

  async synchronizeProjektiFiles(oid: string, synchronizationDate?: string | null): Promise<void> {
    await aineistoSynchronizerService.synchronizeProjektiFilesAtSpecificDate(oid, synchronizationDate);
  }

  abstract uudelleenkuuluta(projekti: DBProjekti): Promise<void>;

  abstract lisaaUusiKierros(projekti: DBProjekti): Promise<void>;

  abstract checkPriviledgesLisaaKierros(projekti: DBProjekti): NykyinenKayttaja;

  abstract checkPriviledgesApproveReject(projekti: DBProjekti): NykyinenKayttaja;

  abstract checkPriviledgesSendForApproval(projekti: DBProjekti): NykyinenKayttaja;

  abstract checkUudelleenkuulutusPriviledges(projekti: DBProjekti): NykyinenKayttaja;

  abstract sendForApproval(projekti: DBProjekti, kayttaja: NykyinenKayttaja): Promise<void>;

  abstract reject(projekti: DBProjekti, syy: string | null | undefined): Promise<void>;

  abstract approve(projekti: DBProjekti, kayttaja: NykyinenKayttaja): Promise<void>;

  abstract validateLisaaKierros(projekti: DBProjekti): void;

  abstract validateUudelleenkuulutus(projekti: DBProjekti, kuulutus: T, hyvaksyttyJulkaisu: Y | undefined): Promise<void>;

  abstract validateSendForApproval(projekti: DBProjekti): void;

  abstract getProjektiPathForKuulutus(projekti: DBProjekti, kuulutus: T | null | undefined): PathTuple;

  abstract saveVaihe(projekti: DBProjekti, newKuulutus: T): Promise<void>;

  private validateKunnatHasBeenSet(projekti: DBProjekti) {
    const kunnatVelho = projekti.velho?.kunnat;
    const kunnatVaihe = this.getVaihe(projekti).ilmoituksenVastaanottajat?.kunnat;
    if (!(kunnatVelho && kunnatVelho.length > 0 && kunnatVaihe && kunnatVaihe.length > 0)) {
      throw new IllegalArgumentError("Kuntia ei ole asetettu!");
    }
  }

  protected async handleAsianhallintaSynkronointi(oid: string, asianhallintaEventId:string|null|undefined): Promise<void> {
    // Ladataan projekti kannasta, jotta siinä on kaikki päivittyneet tiedot mukana
    const projekti = await projektiDatabase.loadProjektiByOid(oid);
    assertIsDefined(projekti);
    const synkronointi = this.getVaiheAineisto(projekti).getAsianhallintaSynkronointi(projekti, asianhallintaEventId);
    if (synkronointi) {
      await asianhallintaService.saveAndEnqueueSynchronization(oid, synkronointi);
    }
  }
}
