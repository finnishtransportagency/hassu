import {
  DBProjekti,
  HyvaksymisPaatosVaihe,
  HyvaksymisPaatosVaiheJulkaisu,
  HyvaksymisPaatosVaihePDF,
  LocalizedMap,
  NahtavillaoloPDF,
  NahtavillaoloVaihe,
  NahtavillaoloVaiheJulkaisu,
} from "../../database/model";
import { log } from "../../logger";
import { fileService } from "../../files/fileService";
import { PathTuple, ProjektiPaths } from "../../files/ProjektiPath";
import { projektiDatabase } from "../../database/projektiDatabase";
import { assertIsDefined } from "../../util/assertions";
import {
  GenericDbKuulutusJulkaisu,
  GenericKuulutus,
  findHyvaksymisPaatosVaiheWaitingForApproval,
  findJatkoPaatos1VaiheWaitingForApproval,
  findJatkoPaatos2VaiheWaitingForApproval,
  findNahtavillaoloWaitingForApproval,
} from "../../projekti/projektiUtil";
import { nahtavillaoloVaiheJulkaisuDatabase } from "../../database/KuulutusJulkaisuDatabase";

type UndefinedOrNullOr<T> = T | undefined | null;

export abstract class SimpleKuulutusTilaManager<
  T extends Omit<GenericKuulutus, "tila" | "kuulutusVaihePaattyyPaiva">,
  Y extends GenericDbKuulutusJulkaisu
> {
  abstract getVaihe(projekti: DBProjekti): UndefinedOrNullOr<T>;
  abstract rejectAineistomuokkaus(projekti: DBProjekti, syy: string | null | undefined): Promise<void>;
  abstract getJulkaisut(projekti: DBProjekti): Y[] | undefined;
  abstract getUpdatedVaiheTiedotForPeruAineistoMuokkaus(kuulutus: Y): T;
  abstract getProjektiPathForKuulutus(projekti: DBProjekti, kuulutus: T | Y | null | undefined): PathTuple;
  abstract getVaihePathname(): string;
  abstract saveVaihe(projekti: DBProjekti, newKuulutus: T): Promise<void>;

  async peruAineistoMuokkaus(projekti: DBProjekti): Promise<void> {
    const kuulutusLuonnos = this.getVaihe(projekti);
    const julkaisut = this.getJulkaisut(projekti);
    const viimeisinJulkaisu = julkaisut ? julkaisut[julkaisut.length - 1] : undefined;

    if (julkaisut && kuulutusLuonnos && viimeisinJulkaisu && kuulutusLuonnos.aineistoMuokkaus) {
      log.info("Peru aineistomuokkaus julkaisulle", { julkaisu: viimeisinJulkaisu });

      const uusiKuulutus = this.getUpdatedVaiheTiedotForPeruAineistoMuokkaus(viimeisinJulkaisu);

      const sourceFolder = this.getProjektiPathForKuulutus(projekti, viimeisinJulkaisu);

      await fileService.deleteProjektiFilesRecursively(new ProjektiPaths(projekti.oid), this.getVaihePathname() + "/" + kuulutusLuonnos.id);
      log.info("Perutun aineitojen muokkauksen tiedostojen poisto onnistui", { sourceFolder });
      await this.saveVaihe(projekti, uusiKuulutus);
      log.info("Peru aineistomuokkaus ja aseta vanhat arvot takaisin", {
        projektiEnnenTallennusta: projekti,
        tallennettavaKuulutus: uusiKuulutus,
      });
    }
  }
}

export class SimpleNahtavillaoloVaiheTilaManager extends SimpleKuulutusTilaManager<NahtavillaoloVaihe, NahtavillaoloVaiheJulkaisu> {
  getVaihe(projekti: DBProjekti): UndefinedOrNullOr<NahtavillaoloVaihe> {
    const vaihe = projekti.nahtavillaoloVaihe;
    return vaihe;
  }
  getJulkaisut(projekti: DBProjekti): NahtavillaoloVaiheJulkaisu[] | undefined {
    return projekti.nahtavillaoloVaiheJulkaisut ?? undefined;
  }
  async rejectAineistomuokkaus(projekti: DBProjekti, syy: string): Promise<void> {
    const julkaisuWaitingForApproval = findNahtavillaoloWaitingForApproval(projekti);
    if (julkaisuWaitingForApproval?.aineistoMuokkaus) {
      const nahtavillaoloVaihe = this.getVaihe(projekti);
      assertIsDefined(nahtavillaoloVaihe, "Nähtävilläolovaiheen pitäisi olla määritelty, jos julkaisukin on");
      nahtavillaoloVaihe.palautusSyy = syy;
      if (!julkaisuWaitingForApproval.nahtavillaoloPDFt) {
        throw new Error("julkaisuWaitingForApproval.nahtavillaoloPDFt puuttuu");
      }
      await this.deletePDFs(projekti.oid, julkaisuWaitingForApproval.nahtavillaoloPDFt);

      await projektiDatabase.saveProjekti({ oid: projekti.oid, versio: projekti.versio, nahtavillaoloVaihe });
      await nahtavillaoloVaiheJulkaisuDatabase.delete(julkaisuWaitingForApproval);
    }
  }
  getUpdatedVaiheTiedotForPeruAineistoMuokkaus(viimeisinJulkaisu: NahtavillaoloVaiheJulkaisu): NahtavillaoloVaihe {
    const {
      yhteystiedot: _yhteystiedot,
      aineistoMuokkaus: _aineistoMuokkaus,
      uudelleenKuulutus: _uudelleenKuulutus,
      tila: _tila,
      ...rest
    } = viimeisinJulkaisu;
    return { ...rest, uudelleenKuulutus: null, aineistoMuokkaus: null };
  }

  getProjektiPathForKuulutus(projekti: DBProjekti, kuulutus: UndefinedOrNullOr<NahtavillaoloVaihe>): PathTuple {
    return new ProjektiPaths(projekti.oid).nahtavillaoloVaihe(kuulutus);
  }
  getVaihePathname(): string {
    return ProjektiPaths.PATH_NAHTAVILLAOLO;
  }
  async saveVaihe(projekti: DBProjekti, vaihe: NahtavillaoloVaihe): Promise<void> {
    await projektiDatabase.saveProjekti({ oid: projekti.oid, versio: projekti.versio, nahtavillaoloVaihe: vaihe });
  }

  private async deletePDFs(oid: string, nahtavillaoloPDFt: LocalizedMap<NahtavillaoloPDF>) {
    for (const language in nahtavillaoloPDFt) {
      // nahtavillaoloPDFt ei ole null, ja language on tyyppiä Kieli, joka on nahtavillaoloPDFt:n avain
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const pdfs: NahtavillaoloPDF = nahtavillaoloPDFt[language];
      await fileService.deleteYllapitoFileFromProjekti({
        oid,
        filePathInProjekti: pdfs.nahtavillaoloPDFPath,
        reason: "Nähtävilläolo rejected",
      });
      await fileService.deleteYllapitoFileFromProjekti({
        oid,
        filePathInProjekti: pdfs.nahtavillaoloIlmoitusPDFPath,
        reason: "Nähtävilläolo rejected",
      });
      await fileService.deleteYllapitoFileFromProjekti({
        oid,
        filePathInProjekti: pdfs.nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath,
        reason: "Nähtävilläolo rejected",
      });
    }
  }
}

export abstract class SimpleAbstractHyvaksymisPaatosVaiheTilaManager extends SimpleKuulutusTilaManager<
  HyvaksymisPaatosVaihe,
  HyvaksymisPaatosVaiheJulkaisu
> {
  getUpdatedVaiheTiedotForPeruAineistoMuokkaus(viimeisinJulkaisu: HyvaksymisPaatosVaiheJulkaisu): HyvaksymisPaatosVaihe {
    const {
      yhteystiedot: _yhteystiedot,
      aineistoMuokkaus: _aineistoMuokkaus,
      uudelleenKuulutus: _uudelleenKuulutus,
      tila: _tila,
      ...rest
    } = viimeisinJulkaisu;
    return { ...rest, uudelleenKuulutus: null, aineistoMuokkaus: null };
  }

  protected async deletePDFs(oid: string, pdft: LocalizedMap<HyvaksymisPaatosVaihePDF>): Promise<void> {
    for (const language in pdft) {
      // pdft ei ole null, ja language on tyyppiä Kieli, joka on pdft:n avain
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const pdfs: HyvaksymisPaatosVaihePDF = pdft[language];
      for (const path of [
        pdfs.hyvaksymisKuulutusPDFPath,
        pdfs.hyvaksymisIlmoitusLausunnonantajillePDFPath,
        pdfs.hyvaksymisIlmoitusMuistuttajillePDFPath,
        pdfs.ilmoitusHyvaksymispaatoskuulutuksestaKunnalleToiselleViranomaisellePDFPath,
        pdfs.ilmoitusHyvaksymispaatoskuulutuksestaPDFPath,
      ]) {
        if (path) {
          await fileService.deleteYllapitoFileFromProjekti({
            oid,
            filePathInProjekti: path,
            reason: "Hyväksymispäätösvaihe rejected",
          });
        }
      }
    }
  }
}

export class SimpleHyvaksymisPaatosVaiheTilaManager extends SimpleAbstractHyvaksymisPaatosVaiheTilaManager {
  getVaihe(projekti: DBProjekti): UndefinedOrNullOr<HyvaksymisPaatosVaihe> {
    const hyvaksymisPaatosVaihe = projekti.hyvaksymisPaatosVaihe;
    return hyvaksymisPaatosVaihe;
  }

  async rejectAineistomuokkaus(projekti: DBProjekti, syy: string): Promise<void> {
    const julkaisu = findHyvaksymisPaatosVaiheWaitingForApproval(projekti);
    if (julkaisu?.aineistoMuokkaus) {
      const hyvaksymisPaatosVaihe = this.getVaihe(projekti);
      assertIsDefined(hyvaksymisPaatosVaihe, "Hyväksymispäätösvaiheen pitäisi olla määritelty, jos julkaisukin on");
      hyvaksymisPaatosVaihe.palautusSyy = syy;
      if (!julkaisu.hyvaksymisPaatosVaihePDFt) {
        throw new Error("julkaisu.hyvaksymisPaatosVaihePDFt puuttuu");
      }
      await this.deletePDFs(projekti.oid, julkaisu.hyvaksymisPaatosVaihePDFt);

      await projektiDatabase.saveProjekti({ oid: projekti.oid, versio: projekti.versio, hyvaksymisPaatosVaihe });
      await projektiDatabase.hyvaksymisPaatosVaiheJulkaisut.delete(projekti, julkaisu.id);
    }
  }

  getJulkaisut(projekti: DBProjekti): HyvaksymisPaatosVaiheJulkaisu[] | undefined {
    return projekti.hyvaksymisPaatosVaiheJulkaisut ?? undefined;
  }
  getProjektiPathForKuulutus(projekti: DBProjekti, kuulutus: UndefinedOrNullOr<HyvaksymisPaatosVaihe>): PathTuple {
    return new ProjektiPaths(projekti.oid).hyvaksymisPaatosVaihe(kuulutus);
  }
  getVaihePathname(): string {
    return ProjektiPaths.PATH_HYVAKSYMISPAATOS;
  }
  async saveVaihe(projekti: DBProjekti, hyvaksymisPaatosVaihe: HyvaksymisPaatosVaihe): Promise<void> {
    await projektiDatabase.saveProjekti({ oid: projekti.oid, versio: projekti.versio, hyvaksymisPaatosVaihe });
  }
}

export class SimpleJatkoPaatos1VaiheTilaManager extends SimpleAbstractHyvaksymisPaatosVaiheTilaManager {
  getVaihe(projekti: DBProjekti): UndefinedOrNullOr<HyvaksymisPaatosVaihe> {
    const jatkoPaatos1Vaihe = projekti.jatkoPaatos1Vaihe;
    return jatkoPaatos1Vaihe;
  }

  async rejectAineistomuokkaus(projekti: DBProjekti, syy: string): Promise<void> {
    const julkaisu = findJatkoPaatos1VaiheWaitingForApproval(projekti);
    if (julkaisu?.aineistoMuokkaus) {
      const jatkoPaatos1Vaihe = this.getVaihe(projekti);
      assertIsDefined(jatkoPaatos1Vaihe, "Jatkopäätös1vaiheen pitäisi olla määritelty, jos julkaisukin on");
      jatkoPaatos1Vaihe.palautusSyy = syy;
      if (!julkaisu.hyvaksymisPaatosVaihePDFt) {
        throw new Error("julkaisu.hyvaksymisPaatosVaihePDFt puuttuu");
      }
      await this.deletePDFs(projekti.oid, julkaisu.hyvaksymisPaatosVaihePDFt);

      await projektiDatabase.saveProjekti({ oid: projekti.oid, versio: projekti.versio, jatkoPaatos1Vaihe });
      await projektiDatabase.jatkoPaatos1VaiheJulkaisut.delete(projekti, julkaisu.id);
    }
  }

  getJulkaisut(projekti: DBProjekti): HyvaksymisPaatosVaiheJulkaisu[] | undefined {
    return projekti.jatkoPaatos1VaiheJulkaisut ?? undefined;
  }
  getProjektiPathForKuulutus(projekti: DBProjekti, kuulutus: UndefinedOrNullOr<HyvaksymisPaatosVaihe>): PathTuple {
    return new ProjektiPaths(projekti.oid).jatkoPaatos1Vaihe(kuulutus);
  }
  getVaihePathname(): string {
    return ProjektiPaths.PATH_JATKOPAATOS1;
  }
  async saveVaihe(projekti: DBProjekti, jatkoPaatos1Vaihe: HyvaksymisPaatosVaihe): Promise<void> {
    await projektiDatabase.saveProjekti({ oid: projekti.oid, versio: projekti.versio, jatkoPaatos1Vaihe });
  }
}

export class SimpleJatkoPaatos2VaiheTilaManager extends SimpleAbstractHyvaksymisPaatosVaiheTilaManager {
  getVaihe(projekti: DBProjekti): UndefinedOrNullOr<HyvaksymisPaatosVaihe> {
    const jatkoPaatos1Vaihe = projekti.jatkoPaatos2Vaihe;
    return jatkoPaatos1Vaihe;
  }

  async rejectAineistomuokkaus(projekti: DBProjekti, syy: string): Promise<void> {
    const julkaisu = findJatkoPaatos2VaiheWaitingForApproval(projekti);
    if (julkaisu?.aineistoMuokkaus) {
      const jatkoPaatos2Vaihe = this.getVaihe(projekti);
      assertIsDefined(jatkoPaatos2Vaihe, "Jatkopäätös2vaiheen pitäisi olla määritelty, jos julkaisukin on");
      jatkoPaatos2Vaihe.palautusSyy = syy;
      if (!julkaisu.hyvaksymisPaatosVaihePDFt) {
        throw new Error("julkaisu.hyvaksymisPaatosVaihePDFt puuttuu");
      }
      await this.deletePDFs(projekti.oid, julkaisu.hyvaksymisPaatosVaihePDFt);

      await projektiDatabase.saveProjekti({ oid: projekti.oid, versio: projekti.versio, jatkoPaatos2Vaihe });
      await projektiDatabase.jatkoPaatos2VaiheJulkaisut.delete(projekti, julkaisu.id);
    }
  }

  getJulkaisut(projekti: DBProjekti): HyvaksymisPaatosVaiheJulkaisu[] | undefined {
    return projekti.jatkoPaatos2VaiheJulkaisut ?? undefined;
  }
  getProjektiPathForKuulutus(projekti: DBProjekti, kuulutus: UndefinedOrNullOr<HyvaksymisPaatosVaihe>): PathTuple {
    return new ProjektiPaths(projekti.oid).jatkoPaatos2Vaihe(kuulutus);
  }
  getVaihePathname(): string {
    return ProjektiPaths.PATH_JATKOPAATOS2;
  }
  async saveVaihe(projekti: DBProjekti, jatkoPaatos2Vaihe: HyvaksymisPaatosVaihe): Promise<void> {
    await projektiDatabase.saveProjekti({ oid: projekti.oid, versio: projekti.versio, jatkoPaatos2Vaihe });
  }
}
