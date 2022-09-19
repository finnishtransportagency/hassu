import { NykyinenKayttaja, TilaSiirtymaInput, TilasiirtymaToiminto, TilasiirtymaTyyppi } from "../../../../common/graphql/apiModel";
import { requirePermissionLuku, requirePermissionMuokkaa } from "../../user";
import { projektiDatabase } from "../../database/projektiDatabase";
import { emailHandler } from "../emailHandler";
import { DBProjekti } from "../../database/model";
import { requireProjektiPaallikko } from "../../user/userService";

export abstract class TilaManager {
  protected tyyppi: TilasiirtymaTyyppi;

  public async siirraTila({ oid, syy, toiminto, tyyppi }: TilaSiirtymaInput): Promise<void> {
    requirePermissionLuku();
    this.tyyppi = tyyppi;
    const projekti = await projektiDatabase.loadProjektiByOid(oid);

    if (toiminto == TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI) {
      await this.sendForApprovalInternal(projekti);
    } else if (toiminto == TilasiirtymaToiminto.HYLKAA) {
      await this.rejectInternal(projekti, syy);
    } else if (toiminto == TilasiirtymaToiminto.HYVAKSY) {
      await this.approveInternal(projekti);
    } else {
      throw new Error("Tuntematon toiminto");
    }

    await emailHandler.sendEmailsByToiminto(toiminto, oid);

    return Promise.resolve(undefined);
  }

  private async sendForApprovalInternal(projekti: DBProjekti) {
    const muokkaaja = requirePermissionMuokkaa(projekti);
    await this.sendForApproval(projekti, muokkaaja);
  }

  private async rejectInternal(projekti: DBProjekti, syy: string) {
    requireProjektiPaallikko(projekti);
    await this.reject(projekti, syy);
  }

  private async approveInternal(projekti: DBProjekti) {
    const projektiPaallikko = requireProjektiPaallikko(projekti);
    await this.approve(projekti, projektiPaallikko);
  }

  abstract sendForApproval(projekti: DBProjekti, projektipaallikko: NykyinenKayttaja): Promise<void>;

  abstract reject(projekti: DBProjekti, syy: string): Promise<void>;

  abstract approve(projekti: DBProjekti, projektiPaallikko: NykyinenKayttaja): Promise<void>;
}
