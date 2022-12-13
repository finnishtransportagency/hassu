import {
  KuulutusJulkaisuTila,
  NykyinenKayttaja,
  TilaSiirtymaInput,
  TilasiirtymaToiminto,
  TilasiirtymaTyyppi,
} from "../../../../common/graphql/apiModel";
import { requirePermissionLuku, requirePermissionMuokkaa } from "../../user";
import { projektiDatabase } from "../../database/projektiDatabase";
import { emailHandler } from "../emailHandler";
import { DBProjekti, UudelleenkuulutusTila } from "../../database/model";
import { requireAdmin, requireOmistaja } from "../../user/userService";
import { aineistoSynchronizerService } from "../../aineisto/aineistoSynchronizerService";
import { findJulkaisuWithTila, GenericKuulutus, GenericKuulutusJulkaisu } from "../../projekti/projektiUtil";
import { assertIsDefined } from "../../util/assertions";
import { isKuulutusPaivaInThePast } from "../../projekti/status/projektiJulkinenStatusHandler";
import { fileService } from "../../files/fileService";
import { PathTuple } from "../../files/ProjektiPath";

export abstract class TilaManager<T extends GenericKuulutus, Y extends GenericKuulutusJulkaisu> {
  protected tyyppi!: TilasiirtymaTyyppi;

  abstract getVaihe(projekti: DBProjekti): T;

  abstract getJulkaisut(projekti: DBProjekti): Y[] | undefined;

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

  async uudelleenkuuluta(projekti: DBProjekti): Promise<void> {
    requireAdmin();

    const kuulutus = this.getVaihe(projekti);
    const julkaisut = this.getJulkaisut(projekti);
    const hyvaksyttyJulkaisu = findJulkaisuWithTila(julkaisut, KuulutusJulkaisuTila.HYVAKSYTTY);

    this.validateUudelleenkuulutus(projekti, kuulutus, hyvaksyttyJulkaisu);
    assertIsDefined(julkaisut);
    assertIsDefined(kuulutus);
    assertIsDefined(hyvaksyttyJulkaisu);

    const julkinenUudelleenKuulutus = isKuulutusPaivaInThePast(hyvaksyttyJulkaisu.kuulutusPaiva);

    let uudelleenKuulutus;
    if (julkinenUudelleenKuulutus) {
      uudelleenKuulutus = {
        tila: UudelleenkuulutusTila.JULKAISTU_PERUUTETTU,
        alkuperainenHyvaksymisPaiva: hyvaksyttyJulkaisu.hyvaksymisPaiva || undefined,
      };
    } else {
      uudelleenKuulutus = {
        tila: UudelleenkuulutusTila.PERUUTETTU,
      };
    }
    kuulutus.uudelleenKuulutus = uudelleenKuulutus;
    const newAloitusKuulutus = { ...kuulutus, id: julkaisut.length + 1 };
    const sourceFolder = this.getProjektiPathForKuulutus(projekti, kuulutus);

    const targetFolder = this.getProjektiPathForKuulutus(projekti, newAloitusKuulutus);
    await fileService.renameYllapitoFolder(sourceFolder, targetFolder);
    await this.saveVaihe(projekti, newAloitusKuulutus);
  }

  async synchronizeProjektiFiles(oid: string, isUudelleenKuulutus: boolean, synchronizationDate?: string | null): Promise<void> {
    if (isUudelleenKuulutus && synchronizationDate) {
      await aineistoSynchronizerService.synchronizeProjektiFilesAtSpecificDate(oid, synchronizationDate);
    } else {
      await aineistoSynchronizerService.synchronizeProjektiFiles(oid);
    }
  }

  abstract sendForApproval(projekti: DBProjekti, projektipaallikko: NykyinenKayttaja): Promise<void>;

  abstract reject(projekti: DBProjekti, syy: string | null | undefined): Promise<void>;

  abstract approve(projekti: DBProjekti, projektiPaallikko: NykyinenKayttaja): Promise<void>;

  abstract validateUudelleenkuulutus(projekti: DBProjekti, kuulutus: T, hyvaksyttyJulkaisu: Y | undefined): void;

  abstract getProjektiPathForKuulutus(projekti: DBProjekti, kuulutus: T | null | undefined): PathTuple;

  abstract saveVaihe(projekti: DBProjekti, newAloitusKuulutus: T): Promise<void>;
}
