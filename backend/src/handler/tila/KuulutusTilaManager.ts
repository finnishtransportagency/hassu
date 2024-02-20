import { Aineisto, DBProjekti, KuulutusSaamePDFt, UudelleenkuulutusTila } from "../../database/model";
import { requireAdmin, requirePermissionMuokkaa } from "../../user";
import { KuulutusJulkaisuTila, NykyinenKayttaja, TilasiirtymaTyyppi } from "hassu-common/graphql/apiModel";
import {
  findJulkaisutWithTila,
  findJulkaisuWithTila,
  GenericDbKuulutusJulkaisu,
  GenericKuulutus,
  sortByKuulutusPaivaDesc,
} from "../../projekti/projektiUtil";
import { assertIsDefined } from "../../util/assertions";
import { fileService } from "../../files/fileService";
import { PathTuple, ProjektiPaths } from "../../files/ProjektiPath";
import { auditLog } from "../../logger";
import { TilaManager } from "./TilaManager";
import { isDateTimeInThePast, nyt, parseOptionalDate } from "../../util/dateUtil";
import assert from "assert";
import { projektiDatabase } from "../../database/projektiDatabase";
import { AineistoMuokkausError, IllegalArgumentError } from "hassu-common/error";
import { forEverySaameDo } from "../../projekti/adapter/common";
import { isProjektiAsianhallintaIntegrationEnabled } from "../../util/isProjektiAsianhallintaIntegrationEnabled";
import { asianhallintaService } from "../../asianhallinta/asianhallintaService";

export abstract class KuulutusTilaManager<
  T extends Omit<GenericKuulutus, "tila" | "kuulutusVaihePaattyyPaiva">,
  Y extends GenericDbKuulutusJulkaisu
> extends TilaManager<T, Y> {
  async lisaaUusiKierros(_projekti: DBProjekti): Promise<void> {
    throw new IllegalArgumentError("lisaaUusiKierros ei kuulu KuulutusTilaManagerin toimintoihin");
  }

  protected tyyppi!: TilasiirtymaTyyppi;

  abstract getJulkaisut(projekti: DBProjekti): Y[] | undefined;

  abstract getUpdatedVaiheTiedotForPeruAineistoMuokkaus(kuulutus: Y): T;

  // Toistaiseksi yhteenkään kuulutukseen ei voi palata
  isVaiheeseenPalattu(_projekti: DBProjekti): boolean {
    return false;
  }

  async avaaAineistoMuokkaus(projekti: DBProjekti): Promise<void> {
    const kuulutusLuonnos = this.getVaihe(projekti);
    const julkaisut = this.getJulkaisut(projekti);
    const viimeisinJulkaisu = julkaisut ? julkaisut[julkaisut.length - 1] : undefined;
    auditLog.info("Avaa aineistomuokkaus julkaisulle", { julkaisu: viimeisinJulkaisu });

    await this.validateAvaaAineistoMuokkaus(kuulutusLuonnos, viimeisinJulkaisu);
    assertIsDefined(julkaisut);
    assertIsDefined(kuulutusLuonnos);
    assertIsDefined(viimeisinJulkaisu);

    const uusiKuulutus = this.getUpdatedVaiheTiedotForAineistoMuokkaus(projekti, kuulutusLuonnos, viimeisinJulkaisu, julkaisut);

    const sourceFolder = this.getProjektiPathForKuulutus(projekti, viimeisinJulkaisu);

    const targetFolder = this.getProjektiPathForKuulutus(projekti, uusiKuulutus);
    await fileService.copyYllapitoFolder(sourceFolder, targetFolder);
    auditLog.info("Kuulutusvaiheen aineitojen muokkauksen avaus onnistui", { sourceFolder, targetFolder });
    await this.saveVaihe(projekti, uusiKuulutus);
    auditLog.info("Tallenna aineistomuokkaustiedolla varustettu kuulutusvaihe", {
      projektiEnnenTallennusta: projekti,
      tallennettavaKuulutus: uusiKuulutus,
    });
    await this.updateProjektiSchedule(projekti.oid, uusiKuulutus.kuulutusPaiva);
  }

  async peruAineistoMuokkaus(projekti: DBProjekti): Promise<void> {
    const kuulutusLuonnos = this.getVaihe(projekti);
    const julkaisut = this.getJulkaisut(projekti);
    const viimeisinJulkaisu = julkaisut ? julkaisut[julkaisut.length - 1] : undefined;
    auditLog.info("Peru aineistomuokkaus julkaisulle", { julkaisu: viimeisinJulkaisu });

    await this.validatePeruAineistoMuokkaus(kuulutusLuonnos, viimeisinJulkaisu);
    assertIsDefined(julkaisut);
    assertIsDefined(kuulutusLuonnos);
    assertIsDefined(viimeisinJulkaisu);

    const uusiKuulutus = this.getUpdatedVaiheTiedotForPeruAineistoMuokkaus(viimeisinJulkaisu);

    const sourceFolder = this.getProjektiPathForKuulutus(projekti, viimeisinJulkaisu);

    await fileService.deleteProjektiFilesRecursively(new ProjektiPaths(projekti.oid), this.getVaihePathname() + "/" + kuulutusLuonnos.id);
    auditLog.info("Perutun aineitojen muokkauksen tiedostojen poisto onnistui", { sourceFolder });
    await this.saveVaihe(projekti, uusiKuulutus);
    auditLog.info("Peru aineistomuokkaus ja aseta vanhat arvot takaisin", {
      projektiEnnenTallennusta: projekti,
      tallennettavaKuulutus: uusiKuulutus,
    });
  }

  async validateAvaaAineistoMuokkaus(kuulutus: T, viimeisinJulkaisu: Y | undefined): Promise<void> {
    if (kuulutus.aineistoMuokkaus) {
      throw new IllegalArgumentError("Aineistomuokkaus on jo avattu. Et voi avata sitä uudestaan.");
    }
    if (!viimeisinJulkaisu) {
      throw new IllegalArgumentError("Aineistomuokkaus täytyy avata tietylle julkaisulle, ja julkaisua ei löytynyt");
    }
    if (viimeisinJulkaisu.tila !== KuulutusJulkaisuTila.HYVAKSYTTY) {
      throw new IllegalArgumentError("Aineistomuokkauksen voi avata vain hyväksytylle julkaisulle");
    }
    const kuulutusPaiva = parseOptionalDate(viimeisinJulkaisu.kuulutusPaiva);
    if (kuulutusPaiva?.isBefore(nyt())) {
      throw new IllegalArgumentError("Aineistomuokkauksen voi avata vain julkaisulle, jonka kuulutuspäivä ei ole vielä koittanut");
    }
  }

  async validatePeruAineistoMuokkaus(kuulutus: T, viimeisinJulkaisu: Y | undefined): Promise<void> {
    if (!kuulutus.aineistoMuokkaus) {
      throw new AineistoMuokkausError("Aineistomuokkaus ei ole auki. Et voi perua sitä.");
    }
    if (!viimeisinJulkaisu) {
      throw new AineistoMuokkausError("Aineistomuokkaus täytyy perua tietylle julkaisulle, ja julkaisua ei löytynyt");
    }
    if (viimeisinJulkaisu.tila === KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA) {
      throw new IllegalArgumentError("Aineistomuokkausta ei voi perua, jos julkaisu odottaa hyväksyntää. Hylkää julkaisu ensin.");
    }
  }

  async uudelleenkuuluta(projekti: DBProjekti): Promise<void> {
    requireAdmin();

    const kuulutusLuonnos = this.getVaihe(projekti);
    const julkaisut = this.getJulkaisut(projekti);
    const hyvaksyttyJulkaisu = findJulkaisuWithTila(julkaisut, KuulutusJulkaisuTila.HYVAKSYTTY);
    auditLog.info("Uudelleenkuuluta kuulutusvaihe", { julkaisu: hyvaksyttyJulkaisu });

    await this.validateUudelleenkuulutus(projekti, kuulutusLuonnos, hyvaksyttyJulkaisu);
    assertIsDefined(julkaisut);
    assertIsDefined(kuulutusLuonnos);
    assertIsDefined(hyvaksyttyJulkaisu);

    const uusiKuulutus = this.getUpdatedVaiheTiedotForUudelleenkuulutus(projekti, kuulutusLuonnos, hyvaksyttyJulkaisu, julkaisut);

    const sourceFolder = this.getProjektiPathForKuulutus(projekti, hyvaksyttyJulkaisu);

    const targetFolder = this.getProjektiPathForKuulutus(projekti, uusiKuulutus);
    await fileService.copyYllapitoFolder(sourceFolder, targetFolder);
    auditLog.info("Kuulutusvaiheen uudelleenkuulutus onnistui", { sourceFolder, targetFolder });
    await this.saveVaihe(projekti, uusiKuulutus);
    // Jo edellistä julkaisua ei ole julkaistu vielä, perutaan julkaisu
    if (!isDateTimeInThePast(hyvaksyttyJulkaisu.kuulutusPaiva ?? undefined, "start-of-day")) {
      await this.updateJulkaisu(projekti, { ...hyvaksyttyJulkaisu, tila: KuulutusJulkaisuTila.PERUUTETTU });
    }
    auditLog.info("Tallenna uudelleenkuulutustiedolla varustettu kuulutusvaihe", {
      projektiEnnenTallennusta: projekti,
      tallennettavaKuulutus: uusiKuulutus,
    });
  }

  private getUpdatedVaiheTiedotForUudelleenkuulutus(projekti: DBProjekti, kuulutusLuonnos: T, hyvaksyttyJulkaisu: Y, julkaisut: Y[]) {
    const julkinenUudelleenKuulutus =
      !!hyvaksyttyJulkaisu.kuulutusPaiva && isDateTimeInThePast(hyvaksyttyJulkaisu.kuulutusPaiva, "start-of-day");
    const uudelleenKuulutus = julkinenUudelleenKuulutus
      ? {
          tila: UudelleenkuulutusTila.JULKAISTU_PERUUTETTU,
          alkuperainenHyvaksymisPaiva: hyvaksyttyJulkaisu.hyvaksymisPaiva ?? undefined,
        }
      : {
          tila: UudelleenkuulutusTila.PERUUTETTU,
        };

    const uusiId = julkaisut.length + 1;
    const projektiPaths = new ProjektiPaths(projekti.oid);
    const aineistot = this.getUpdatedAineistotForVaihe(kuulutusLuonnos, uusiId, projektiPaths);

    return { ...kuulutusLuonnos, uudelleenKuulutus, id: uusiId, ...aineistot };
  }

  private getUpdatedVaiheTiedotForAineistoMuokkaus(projekti: DBProjekti, kuulutusLuonnos: T, viimeisinJulkaisu: Y, julkaisut: Y[]) {
    const aineistoMuokkaus = {
      alkuperainenHyvaksymisPaiva: viimeisinJulkaisu.hyvaksymisPaiva ?? undefined,
    };

    const uusiId = julkaisut.length + 1;
    const projektiPaths = new ProjektiPaths(projekti.oid);
    const aineistot = this.getUpdatedAineistotForVaihe(kuulutusLuonnos, uusiId, projektiPaths);

    return { ...kuulutusLuonnos, uudelleenKuulutus: viimeisinJulkaisu.uudelleenKuulutus, aineistoMuokkaus, id: uusiId, ...aineistot };
  }

  protected updateAineistoArrayForUudelleenkuulutus(
    aineisto: Aineisto[] | null | undefined,
    oldPathPrefix: string,
    newPathPrefix: string
  ): Aineisto[] | null | undefined {
    return aineisto?.map<Aineisto>(({ tiedosto, ...muuttumattomatAineistoTiedot }) => {
      const translatedTiedosto = tiedosto?.replace(oldPathPrefix, newPathPrefix);
      if (tiedosto && tiedosto == translatedTiedosto) {
        throw new Error(
          `Tiedoston siirto uudelleenkuulutukselle epäonnistui. tiedosto:${tiedosto} oldPathPrefix:${oldPathPrefix} newPathPrefix:${newPathPrefix}`
        );
      }
      return {
        tiedosto: translatedTiedosto,
        ...muuttumattomatAineistoTiedot,
      };
    });
  }

  protected updateKuulutusSaamePDFtForUudelleenkuulutus(
    saamePDFt: KuulutusSaamePDFt | undefined,
    oldPathPrefix: string,
    newPathPrefix: string
  ): KuulutusSaamePDFt | null | undefined {
    if (saamePDFt) {
      forEverySaameDo((kieli) => {
        let pdf = saamePDFt[kieli]?.kuulutusIlmoitusPDF;
        if (pdf) {
          pdf.tiedosto = pdf.tiedosto.replace(oldPathPrefix, newPathPrefix);
        }
        pdf = saamePDFt[kieli]?.kuulutusPDF;
        if (pdf) {
          pdf.tiedosto = pdf.tiedosto.replace(oldPathPrefix, newPathPrefix);
        }
      });
      return saamePDFt;
    }
  }

  checkPriviledgesLisaaKierros(projekti: DBProjekti): NykyinenKayttaja {
    return requirePermissionMuokkaa(projekti);
  }

  abstract checkPriviledgesApproveReject(projekti: DBProjekti): NykyinenKayttaja;

  abstract checkPriviledgesSendForApproval(projekti: DBProjekti): NykyinenKayttaja;

  abstract checkUudelleenkuulutusPriviledges(projekti: DBProjekti): NykyinenKayttaja;

  abstract sendForApproval(projekti: DBProjekti, kayttaja: NykyinenKayttaja, tilasiirtymaTyyppi: TilasiirtymaTyyppi): Promise<void>;

  abstract getUpdatedAineistotForVaihe(vaihe: T, uusiId: number, paths: ProjektiPaths): Partial<T>;

  abstract reject(projekti: DBProjekti, syy: string | null | undefined): Promise<void>;

  abstract palaa(projekti: DBProjekti): Promise<void>;

  abstract getVaihePathname(): string;

  async reloadProjekti(projekti: DBProjekti): Promise<DBProjekti> {
    const newProjekti = await projektiDatabase.loadProjektiByOid(projekti.oid);
    if (!newProjekti) {
      throw new IllegalArgumentError("Projektia ei löytynyt oid:lla '" + projekti.oid + "'");
    }
    projekti = newProjekti;
    return projekti;
  }

  async updateJulkaisuToBeApproved(projekti: DBProjekti, hyvaksyja: NykyinenKayttaja): Promise<Y> {
    const julkaisuWaitingForApproval = this.getKuulutusWaitingForApproval(projekti);
    if (!julkaisuWaitingForApproval) {
      throw new Error("Ei kuulutusta odottamassa hyväksyntää");
    }
    // Kaikki aiemmat hyväksytyt julkaisut laitetaan peruutetuiksi,
    // paitsi nyt hyväksyttävän julkaisun julkaisupäivä on tulevaisuudessa,
    // jolloin jätetään viimeisin julki oleva julkaisu näkyville.
    assert(julkaisuWaitingForApproval.kuulutusPaiva, "kuulutusPaiva on oltava tässä kohtaa");
    const isJulkaisuWaitingForApprovalInPast = isDateTimeInThePast(julkaisuWaitingForApproval.kuulutusPaiva, "start-of-day");

    const hyvaksytytJulkaisut = findJulkaisutWithTila(
      this.getJulkaisut(projekti),
      KuulutusJulkaisuTila.HYVAKSYTTY,
      sortByKuulutusPaivaDesc
    );

    if (!isJulkaisuWaitingForApprovalInPast) {
      const indexOfNewestHyvaksyttyJulkaisuInPast = hyvaksytytJulkaisut?.findIndex((julkaisu) => {
        assertIsDefined(julkaisu.kuulutusPaiva);
        return isDateTimeInThePast(julkaisu.kuulutusPaiva, "start-of-day");
      });

      if (indexOfNewestHyvaksyttyJulkaisuInPast !== undefined && indexOfNewestHyvaksyttyJulkaisuInPast > -1) {
        hyvaksytytJulkaisut?.splice(indexOfNewestHyvaksyttyJulkaisuInPast, 1);
      }
    }

    const promises = hyvaksytytJulkaisut?.map<Promise<void>>(async (julkaisu) => {
      julkaisu.tila = KuulutusJulkaisuTila.PERUUTETTU;
      await this.updateJulkaisu(projekti, julkaisu);
    });
    if (promises) {
      await Promise.all(promises);
    }

    julkaisuWaitingForApproval.tila = KuulutusJulkaisuTila.HYVAKSYTTY;
    julkaisuWaitingForApproval.hyvaksyja = hyvaksyja.uid;
    julkaisuWaitingForApproval.hyvaksymisPaiva = nyt().format();
    await this.updateJulkaisu(projekti, julkaisuWaitingForApproval);
    return julkaisuWaitingForApproval;
  }

  private async updateAsiaIdToProjekti(projekti: DBProjekti): Promise<void> {
    if (!projekti.asianhallinta?.asiaId && (await isProjektiAsianhallintaIntegrationEnabled(projekti))) {
      const asiaId = await asianhallintaService.getAsiaId(projekti.oid);
      if (asiaId) {
        await projektiDatabase.saveProjektiWithoutLocking({ oid: projekti.oid, asianhallinta: { ...projekti.asianhallinta, asiaId } });
      }
    }
  }

  async approve(projekti: DBProjekti, hyvaksyja: NykyinenKayttaja): Promise<void> {
    await this.updateAsiaIdToProjekti(projekti);
    const approvedJulkaisu = await this.updateJulkaisuToBeApproved(await this.reloadProjekti(projekti), hyvaksyja);
    await this.cleanupKuulutusLuonnosAfterApproval(await this.reloadProjekti(projekti));
    await this.updateProjektiSchedule(projekti.oid, approvedJulkaisu.kuulutusPaiva);
    await this.sendApprovalMailsAndAttachments(projekti.oid);
    if (!approvedJulkaisu.aineistoMuokkaus) {
      await this.handleAsianhallintaSynkronointi(projekti.oid, approvedJulkaisu.asianhallintaEventId);
    }
  }

  checkPriviledgesAvaaAineistoMuokkaus(projekti: DBProjekti): NykyinenKayttaja {
    return requirePermissionMuokkaa(projekti);
  }

  checkPriviledgesPeruAineistoMuokkaus(projekti: DBProjekti): NykyinenKayttaja {
    return requirePermissionMuokkaa(projekti);
  }

  abstract sendApprovalMailsAndAttachments(oid: string): Promise<void>;

  abstract updateJulkaisu(projekti: DBProjekti, julkaisu: Y): Promise<void>;

  abstract getKuulutusWaitingForApproval(projekti: DBProjekti): Y | undefined;

  abstract validateUudelleenkuulutus(projekti: DBProjekti, kuulutus: T, hyvaksyttyJulkaisu: Y | undefined): Promise<void>;

  validateLisaaKierros(_projekti: DBProjekti): void {
    return;
  }

  abstract getProjektiPathForKuulutus(projekti: DBProjekti, kuulutus: T | Y | null | undefined): PathTuple;

  abstract saveVaihe(projekti: DBProjekti, newKuulutus: T): Promise<void>;

  async cleanupKuulutusLuonnosAfterApproval(projekti: DBProjekti): Promise<void> {
    const luonnostilainenKuulutus = this.getVaihe(projekti);
    let hasChanges = false;
    if (luonnostilainenKuulutus.palautusSyy) {
      luonnostilainenKuulutus.palautusSyy = null;
      hasChanges = true;
    }

    if (luonnostilainenKuulutus.uudelleenKuulutus) {
      luonnostilainenKuulutus.uudelleenKuulutus = null;
      hasChanges = true;
    }

    if (luonnostilainenKuulutus.aineistoMuokkaus) {
      luonnostilainenKuulutus.aineistoMuokkaus = null;
      hasChanges = true;
    }

    if (hasChanges) {
      await this.saveVaihe(projekti, luonnostilainenKuulutus);
    }
  }
}
