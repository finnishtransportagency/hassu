import { NykyinenKayttaja, TilaSiirtymaInput, TilasiirtymaToiminto, TilasiirtymaTyyppi } from "../../../../common/graphql/apiModel";
import { requirePermissionLuku, requirePermissionMuokkaa } from "../../user";
import { projektiDatabase } from "../../database/projektiDatabase";
import { emailHandler } from "../emailHandler";
import { DBProjekti } from "../../database/model";
import { requireAdmin, requireOmistaja } from "../../user/userService";

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
      await this.uudelleenkuulutaInternal(projekti);
    } else {
      throw new Error("Tuntematon toiminto");
    }

    await emailHandler.sendEmailsByToiminto(toiminto, oid, tyyppi);

    return Promise.resolve(undefined);
  }

  private async sendForApprovalInternal(projekti: DBProjekti) {
    const muokkaaja = requirePermissionMuokkaa(projekti);
    await this.sendForApproval(projekti, muokkaaja);
  }

  private async rejectInternal(projekti: DBProjekti, syy: string) {
    requireOmistaja(projekti);
    await this.reject(projekti, syy);
  }

  private async approveInternal(projekti: DBProjekti) {
    const projektiPaallikko = requireOmistaja(projekti);
    await this.approve(projekti, projektiPaallikko);
  }

  private async uudelleenkuulutaInternal(projekti: DBProjekti) {
    requireAdmin();
    await this.uudelleenkuuluta(projekti);
  }

  abstract sendForApproval(projekti: DBProjekti, projektipaallikko: NykyinenKayttaja): Promise<void>;

  abstract reject(projekti: DBProjekti, syy: string | null | undefined): Promise<void>;

  abstract approve(projekti: DBProjekti, projektiPaallikko: NykyinenKayttaja): Promise<void>;

  abstract uudelleenkuuluta(projekti: DBProjekti): Promise<void>;
}
