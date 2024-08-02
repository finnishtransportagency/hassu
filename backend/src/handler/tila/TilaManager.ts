import { requireAdmin, requirePermissionLuku } from "../../user";
import { projektiDatabase } from "../../database/projektiDatabase";
import { DBProjekti } from "../../database/model";
import {
  AsianTila,
  NykyinenKayttaja,
  TilaSiirtymaInput,
  TilasiirtymaToiminto,
  TilasiirtymaTyyppi,
  Vaihe,
} from "hassu-common/graphql/apiModel";
import { projektiSchedulerService } from "../../sqsEvents/projektiSchedulerService";
import { PathTuple } from "../../files/ProjektiPath";
import { auditLog } from "../../logger";
import { IllegalArgumentError } from "hassu-common/error";
import { GenericVaihe } from "../../projekti/projektiUtil";
import { nyt, parseDate } from "../../util/dateUtil";
import { VaiheTiedostoManager } from "../../tiedostot/ProjektiTiedostoManager";
import { asianhallintaService } from "../../asianhallinta/asianhallintaService";
import { assertIsDefined } from "../../util/assertions";
import { isProjektiAsianhallintaIntegrationEnabled } from "../../util/isProjektiAsianhallintaIntegrationEnabled";
import { PublishOrExpireEventType } from "../../sqsEvents/projektiScheduleManager";
export abstract class TilaManager<T extends GenericVaihe, Y> {
  protected tyyppi!: TilasiirtymaTyyppi;
  protected vaihe: Vaihe;

  // Käytetään asianhallinnantilan validoinnissa
  // Oletuksena palattuVaihe on sama kuin vaihe
  protected palattuVaihe: Vaihe;

  constructor(vaihe: Vaihe, palattuVaihe = vaihe) {
    this.vaihe = vaihe;
    this.palattuVaihe = palattuVaihe;
  }

  abstract isVaiheeseenPalattu(projekti: DBProjekti): boolean;

  abstract getVaihe(projekti: DBProjekti): T;

  abstract getVaiheAineisto(projekti: DBProjekti): VaiheTiedostoManager<T, Y>;

  public async siirraTila({ oid, syy, toiminto, tyyppi }: TilaSiirtymaInput): Promise<void> {
    requirePermissionLuku();
    this.tyyppi = tyyppi;
    const projekti = await projektiDatabase.loadProjektiByOid(oid);
    if (!projekti) {
      throw new Error("Ei voi sirtää projektin tilaa, koska projektia ei löydy");
    }

    const isTyyppiEligibleForAineistoMuokkaus = [
      TilasiirtymaTyyppi.NAHTAVILLAOLO,
      TilasiirtymaTyyppi.HYVAKSYMISPAATOSVAIHE,
      TilasiirtymaTyyppi.JATKOPAATOS_1,
      TilasiirtymaTyyppi.JATKOPAATOS_2,
    ].includes(tyyppi);

    if (toiminto == TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI) {
      await this.sendForApprovalInternal(projekti, tyyppi);
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
      if (!isTyyppiEligibleForAineistoMuokkaus) {
        throw new Error("avaaAineistoMuokkaus ei kuulu aloituskuulutuksen toimintoihin");
      } else {
        await this.avaaAineistoMuokkausInternal(projekti);
      }
    } else if (toiminto == TilasiirtymaToiminto.PERU_AINEISTOMUOKKAUS) {
      if (!isTyyppiEligibleForAineistoMuokkaus) {
        throw new Error("peruAineistoMuokkaus ei kuulu aloituskuulutuksen toimintoihin");
      } else {
        await this.peruAineistoMuokkausInternal(projekti);
      }
    } else if (toiminto == TilasiirtymaToiminto.HYLKAA_JA_PERU_AINEISTOMUOKKAUS) {
      if (!isTyyppiEligibleForAineistoMuokkaus) {
        throw new Error("hylkaaAineistoMuokkaus ei kuulu aloituskuulutuksen toimintoihin");
      } else {
        if (!syy) {
          throw new Error("Aineistomuokkauksen hylkäämiseltä puuttuu syy!");
        }
        await this.rejectAndPeruAineistoMuokkausInternal(projekti, syy);
      }
    } else {
      throw new Error("Tuntematon toiminto");
    }

    return undefined;
  }

  private async palaaInternal(projekti: DBProjekti) {
    this.checkPriviledgesForPalaa();
    this.validatePalaa(projekti);
    auditLog.info("Palaa nykyisestä vaiheesta taaksepäin:", { vaihe: this.getVaihe(projekti) });
    await this.palaa(projekti);
  }

  private async avaaAineistoMuokkausInternal(projekti: DBProjekti) {
    this.checkPriviledgesAvaaAineistoMuokkaus(projekti);
    auditLog.info("Avataan aineistomuokkaus", { vaihe: this.getVaihe(projekti) });
    await this.avaaAineistoMuokkaus(projekti);
  }

  private async peruAineistoMuokkausInternal(projekti: DBProjekti) {
    this.checkPriviledgesPeruAineistoMuokkaus(projekti);
    auditLog.info("Perutaan aineistomuokkaus", { vaihe: this.getVaihe(projekti) });
    await this.peruAineistoMuokkaus(projekti);
  }

  private async lisaaUusiKierrosInternal(projekti: DBProjekti) {
    this.checkPriviledgesLisaaKierros(projekti);
    this.validateLisaaKierros(projekti);
    auditLog.info("Lisaa kierros", { vaihe: this.getVaihe(projekti) });
    await this.lisaaUusiKierros(projekti);
  }

  private async sendForApprovalInternal(projekti: DBProjekti, tilasiirtymaTyyppi: TilasiirtymaTyyppi) {
    const kayttaja = this.checkPriviledgesSendForApproval(projekti);
    this.validateSendForApproval(projekti);
    this.validateKunnatHasBeenSet(projekti);
    await this.validateAsianhallintaValmiinaSiirtoon(projekti);
    auditLog.info("Lähetä hyväksyttäväksi", { vaihe: this.getVaihe(projekti) });
    await this.sendForApproval(projekti, kayttaja, tilasiirtymaTyyppi);
  }

  private async rejectInternal(projekti: DBProjekti, syy: string) {
    this.checkPriviledgesApproveReject(projekti);
    auditLog.info("Hylkää hyväksyntä", { vaihe: this.getVaihe(projekti) });
    await this.reject(projekti, syy);
  }

  private async rejectAndPeruAineistoMuokkausInternal(projekti: DBProjekti, syy: string) {
    this.checkPriviledgesApproveReject(projekti);
    auditLog.info("Hylkää aineistomuokkauksen hyväksyntä", { vaihe: this.getVaihe(projekti) });
    await this.rejectAndPeruAineistoMuokkaus(projekti, syy);
  }

  private async approveInternal(projekti: DBProjekti) {
    const kayttaja = this.checkPriviledgesApproveReject(projekti);
    this.validateKunnatHasBeenSet(projekti);
    await this.validateAsianhallintaValmiinaSiirtoon(projekti);
    auditLog.info("Hyväksy julkaistavaksi:", { vaihe: this.getVaihe(projekti) });
    await this.approve(projekti, kayttaja);
  }

  private async validateAsianhallintaValmiinaSiirtoon(projekti: DBProjekti) {
    if (!(await isProjektiAsianhallintaIntegrationEnabled(projekti))) {
      return;
    }
    const vaihe = this.isVaiheeseenPalattu(projekti) ? this.palattuVaihe : this.vaihe;

    const asianhallinnanTila = await asianhallintaService.checkAsianhallintaState(projekti.oid, vaihe);

    if (asianhallinnanTila !== AsianTila.VALMIS_VIENTIIN) {
      throw new IllegalArgumentError(`Suunnitelman asia ei ole valmis vientiin. Vaihe: ${this.vaihe}, tila: ${asianhallinnanTila}`);
    }
  }

  private async uudelleenkuulutaInternal(projekti: DBProjekti) {
    this.checkUudelleenkuulutusPriviledges(projekti);
    auditLog.info("Uudelleenkuuluta", { vaihe: this.getVaihe(projekti) });
    await this.uudelleenkuuluta(projekti);
  }

  async updateProjektiSchedule(oid: string, synchronizationDate?: string | null, approvalType?: PublishOrExpireEventType): Promise<void> {
    const date = synchronizationDate ? parseDate(synchronizationDate) : undefined;
    if (!date || date.isBefore(nyt())) {
      // Jos kuulutuspäivä menneisyydessä, kutsu synkronointia heti
      await projektiSchedulerService.synchronizeProjektiFiles(oid, approvalType);
    }
    await projektiSchedulerService.updateProjektiSynchronizationSchedule(oid);
  }

  private checkPriviledgesForPalaa(): NykyinenKayttaja {
    return requireAdmin();
  }

  abstract checkPriviledgesAvaaAineistoMuokkaus(projekti: DBProjekti): NykyinenKayttaja;

  abstract checkPriviledgesPeruAineistoMuokkaus(projekti: DBProjekti): NykyinenKayttaja;

  abstract uudelleenkuuluta(projekti: DBProjekti): Promise<void>;

  abstract lisaaUusiKierros(projekti: DBProjekti): Promise<void>;

  abstract palaa(projekti: DBProjekti): Promise<void>;

  abstract checkPriviledgesLisaaKierros(projekti: DBProjekti): NykyinenKayttaja;

  abstract checkPriviledgesApproveReject(projekti: DBProjekti): NykyinenKayttaja;

  abstract checkPriviledgesSendForApproval(projekti: DBProjekti): NykyinenKayttaja;

  abstract checkUudelleenkuulutusPriviledges(projekti: DBProjekti): NykyinenKayttaja;

  abstract sendForApproval(projekti: DBProjekti, kayttaja: NykyinenKayttaja, tilasiirtymaTyyppi: TilasiirtymaTyyppi): Promise<void>;

  abstract reject(projekti: DBProjekti, syy: string): Promise<void>;

  abstract rejectAndPeruAineistoMuokkaus(projekti: DBProjekti, syy: string): Promise<void>;

  abstract approve(projekti: DBProjekti, kayttaja: NykyinenKayttaja): Promise<void>;

  abstract avaaAineistoMuokkaus(projekti: DBProjekti): Promise<void>;

  abstract peruAineistoMuokkaus(projekti: DBProjekti): Promise<void>;

  abstract validatePalaa(projekti: DBProjekti): void;

  abstract validateLisaaKierros(projekti: DBProjekti): void;

  abstract validateAvaaAineistoMuokkaus(kuulutus: T, hyvaksyttyJulkaisu: Y | undefined): Promise<void>;

  abstract validateUudelleenkuulutus(projekti: DBProjekti, kuulutus: T, hyvaksyttyJulkaisu: Y | undefined): Promise<void>;

  abstract validateSendForApproval(projekti: DBProjekti): Promise<void>;

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
    if (!(await isProjektiAsianhallintaIntegrationEnabled(projekti))) {
      return;
    }
    const synkronointi = this.getVaiheAineisto(projekti).getAsianhallintaSynkronointi(projekti, asianhallintaEventId);
    if (synkronointi) {
      await asianhallintaService.saveAndEnqueueSynchronization(oid, synkronointi);
    }
  }
}
