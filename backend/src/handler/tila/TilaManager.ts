import { requirePermissionLuku } from "../../user";
import { projektiDatabase } from "../../database/projektiDatabase";
import { DBProjekti } from "../../database/model";
import { NykyinenKayttaja, TilaSiirtymaInput, TilasiirtymaToiminto, TilasiirtymaTyyppi } from "../../../../common/graphql/apiModel";
import { aineistoSynchronizerService } from "../../aineisto/aineistoSynchronizerService";
import { PathTuple } from "../../files/ProjektiPath";

export abstract class TilaManager<T, Y> {
  protected tyyppi!: TilasiirtymaTyyppi;

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
    } else {
      throw new Error("Tuntematon toiminto");
    }

    return Promise.resolve(undefined);
  }

  private async sendForApprovalInternal(projekti: DBProjekti) {
    const kayttaja = this.checkPriviledgesSendForApproval(projekti);
    this.validateSendForApproval(projekti);
    await this.sendForApproval(projekti, kayttaja);
  }

  private async rejectInternal(projekti: DBProjekti, syy: string) {
    this.checkPriviledgesApproveReject(projekti);
    await this.reject(projekti, syy);
  }

  private async approveInternal(projekti: DBProjekti) {
    const kayttaja = this.checkPriviledgesApproveReject(projekti);
    await this.approve(projekti, kayttaja);
  }

  private async uudelleenkuulutaInternal(projekti: DBProjekti) {
    this.checkUudelleenkuulutusPriviledges(projekti);
    await this.uudelleenkuuluta(projekti);
  }

  async synchronizeProjektiFiles(oid: string, synchronizationDate?: string | null): Promise<void> {
      await aineistoSynchronizerService.synchronizeProjektiFilesAtSpecificDate(oid, synchronizationDate);
  }

  abstract uudelleenkuuluta(projekti: DBProjekti): Promise<void>;

  abstract checkPriviledgesApproveReject(projekti: DBProjekti): NykyinenKayttaja;

  abstract checkPriviledgesSendForApproval(projekti: DBProjekti): NykyinenKayttaja;

  abstract checkUudelleenkuulutusPriviledges(projekti: DBProjekti): NykyinenKayttaja;

  abstract sendForApproval(projekti: DBProjekti, kayttaja: NykyinenKayttaja): Promise<void>;

  abstract reject(projekti: DBProjekti, syy: string | null | undefined): Promise<void>;

  abstract approve(projekti: DBProjekti, kayttaja: NykyinenKayttaja): Promise<void>;

  abstract validateUudelleenkuulutus(projekti: DBProjekti, kuulutus: T, hyvaksyttyJulkaisu: Y | undefined): void;

  abstract validateSendForApproval(projekti: DBProjekti): void;

  abstract getProjektiPathForKuulutus(projekti: DBProjekti, kuulutus: T | null | undefined): PathTuple;

  abstract saveVaihe(projekti: DBProjekti, newKuulutus: T): Promise<void>;
}
