import { requireAdmin, requirePermissionLuku } from "../../user";
import { projektiDatabase } from "../../database/projektiDatabase";
import { DBProjekti } from "../../database/model";
import { NykyinenKayttaja, TilaSiirtymaInput, TilasiirtymaToiminto, TilasiirtymaTyyppi } from "../../../../common/graphql/apiModel";
import { aineistoSynchronizationSchedulerService } from "../../aineisto/aineistoSynchronizationSchedulerService";
import { PathTuple } from "../../files/ProjektiPath";
import { auditLog } from "../../logger";
import { IllegalArgumentError } from "../../error/IllegalArgumentError";
import { GenericVaihe } from "../../projekti/projektiUtil";
import { nyt, parseDate } from "../../util/dateUtil";
import { VaiheAineisto } from "../../aineisto/projektiAineistoManager";
import { asianhallintaService } from "../../asianhallinta/asianhallintaService";
import { assertIsDefined } from "../../util/assertions";
import { requirePermissionMuokkaaProjekti } from "../../projekti/projektiHandler";

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
    } else if (toiminto == TilasiirtymaToiminto.PALAA) {
      await this.palaaInternal(projekti);
    } else if (toiminto == TilasiirtymaToiminto.AVAA_AINEISTOMUOKKAUS) {
      if (tyyppi == TilasiirtymaTyyppi.ALOITUSKUULUTUS) {
        throw new Error("avaaAineistoMuokkaus ei kuulu aloituskuulutuksen toimintoihin");
      } else {
        await this.avaaAineistoMuokkausInternal(projekti);
      }
    } else if (toiminto == TilasiirtymaToiminto.PERU_AINEISTOMUOKKAUS) {
      if (tyyppi == TilasiirtymaTyyppi.ALOITUSKUULUTUS) {
        throw new Error("peruAineistoMuokkaus ei kuulu aloituskuulutuksen toimintoihin");
      } else {
        await this.peruAineistoMuokkausInternal(projekti);
      }
    } else {
      throw new Error("Tuntematon toiminto");
    }

    return Promise.resolve(undefined);
  }

  private async palaaInternal(projekti: DBProjekti) {
    this.checkPriviledgesForPalaa();
    this.validatePalaa(projekti);
    auditLog.info("Palaa nykyisestä vaiheesta taaksepäin:", { vaihe: this.getVaihe(projekti) });
    await this.palaa(projekti);
  }

  private async avaaAineistoMuokkausInternal(projekti: DBProjekti) {
    this.checkPriviledgesAvaaAineistoMuokkaus(projekti.oid);
    auditLog.info("Avataan aineistomuokkaus", { vaihe: this.getVaihe(projekti) });
    await this.avaaAineistoMuokkaus(projekti);
  }

  private async peruAineistoMuokkausInternal(projekti: DBProjekti) {
    this.checkPriviledgesPeruAineistoMuokkaus(projekti.oid);
    auditLog.info("Perutaan aineistomuokkaus", { vaihe: this.getVaihe(projekti) });
    await this.peruAineistoMuokkaus(projekti);
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
    const date = synchronizationDate ? parseDate(synchronizationDate) : undefined;
    if (!date || date.isBefore(nyt())) {
      // Jos kuulutuspäivä menneisyydessä, kutsu synkronointia heti
      await aineistoSynchronizationSchedulerService.synchronizeProjektiFiles(oid);
    }
    await aineistoSynchronizationSchedulerService.updateProjektiSynchronizationSchedule(oid);
  }

  private checkPriviledgesForPalaa(): NykyinenKayttaja {
    return requireAdmin();
  }

  private checkPriviledgesAvaaAineistoMuokkaus(oid: string): Promise<DBProjekti> {
    return requirePermissionMuokkaaProjekti(oid);
  }

  private checkPriviledgesPeruAineistoMuokkaus(oid: string): Promise<DBProjekti> {
    return requirePermissionMuokkaaProjekti(oid);
  }

  abstract uudelleenkuuluta(projekti: DBProjekti): Promise<void>;

  abstract lisaaUusiKierros(projekti: DBProjekti): Promise<void>;

  abstract palaa(projekti: DBProjekti): Promise<void>;

  abstract checkPriviledgesLisaaKierros(projekti: DBProjekti): NykyinenKayttaja;

  abstract checkPriviledgesApproveReject(projekti: DBProjekti): NykyinenKayttaja;

  abstract checkPriviledgesSendForApproval(projekti: DBProjekti): NykyinenKayttaja;

  abstract checkUudelleenkuulutusPriviledges(projekti: DBProjekti): NykyinenKayttaja;

  abstract sendForApproval(projekti: DBProjekti, kayttaja: NykyinenKayttaja): Promise<void>;

  abstract reject(projekti: DBProjekti, syy: string | null | undefined): Promise<void>;

  abstract approve(projekti: DBProjekti, kayttaja: NykyinenKayttaja): Promise<void>;

  abstract avaaAineistoMuokkaus(projekti: DBProjekti): Promise<void>;

  abstract peruAineistoMuokkaus(projekti: DBProjekti): Promise<void>;

  abstract validatePalaa(projekti: DBProjekti): void;

  abstract validateLisaaKierros(projekti: DBProjekti): void;

  abstract validateAvaaAineistoMuokkaus(kuulutus: T, hyvaksyttyJulkaisu: Y | undefined): Promise<void>;

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

  protected async handleAsianhallintaSynkronointi(oid: string, asianhallintaEventId: string | null | undefined): Promise<void> {
    // Ladataan projekti kannasta, jotta siinä on kaikki päivittyneet tiedot mukana
    const projekti = await projektiDatabase.loadProjektiByOid(oid);
    assertIsDefined(projekti);
    const synkronointi = this.getVaiheAineisto(projekti).getAsianhallintaSynkronointi(projekti, asianhallintaEventId);
    if (synkronointi) {
      await asianhallintaService.saveAndEnqueueSynchronization(oid, synkronointi);
    }
  }
}
