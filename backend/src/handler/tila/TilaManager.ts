import { requirePermissionLuku } from "../../user";
import { projektiDatabase } from "../../database/projektiDatabase";
import { DBProjekti } from "../../database/model";
import { NykyinenKayttaja, TilaSiirtymaInput, TilasiirtymaToiminto, TilasiirtymaTyyppi } from "../../../../common/graphql/apiModel";
import { aineistoSynchronizerService } from "../../aineisto/aineistoSynchronizerService";

export abstract class TilaManager {
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
      await this.uudelleenkuuluta(projekti);
    } else {
      throw new Error("Tuntematon toiminto");
    }

    return Promise.resolve(undefined);
  }

  private async sendForApprovalInternal(projekti: DBProjekti) {
    const kayttaja = this.checkPriviledgesSendForApproval(projekti);
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

  async synchronizeProjektiFiles(oid: string, isUudelleenKuulutus: boolean, synchronizationDate?: string | null): Promise<void> {
    if (isUudelleenKuulutus && synchronizationDate) {
      await aineistoSynchronizerService.synchronizeProjektiFilesAtSpecificDate(oid, synchronizationDate);
    } else {
      await aineistoSynchronizerService.synchronizeProjektiFiles(oid);
    }
  }

  abstract uudelleenkuuluta(projekti: DBProjekti): Promise<void>;

  abstract checkPriviledgesApproveReject(projekti: DBProjekti): NykyinenKayttaja;

  abstract checkPriviledgesSendForApproval(projekti: DBProjekti): NykyinenKayttaja;

  abstract checkUudelleenkuulutusPriviledges(projekti: DBProjekti): NykyinenKayttaja;

  abstract sendForApproval(projekti: DBProjekti, kayttaja: NykyinenKayttaja): Promise<void>;

  abstract reject(projekti: DBProjekti, syy: string | null | undefined): Promise<void>;

  abstract approve(projekti: DBProjekti, kayttaja: NykyinenKayttaja): Promise<void>;
}
