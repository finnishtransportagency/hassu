import { Aineisto, DBProjekti, UudelleenkuulutusTila } from "../../database/model";
import { requireAdmin } from "../../user";
import { KuulutusJulkaisuTila, NykyinenKayttaja, TilasiirtymaTyyppi } from "../../../../common/graphql/apiModel";
import { findJulkaisuWithTila, GenericDbKuulutusJulkaisu, GenericKuulutus } from "../../projekti/projektiUtil";
import { assertIsDefined } from "../../util/assertions";
import { isKuulutusPaivaInThePast } from "../../projekti/status/projektiJulkinenStatusHandler";
import { fileService } from "../../files/fileService";
import { PathTuple, ProjektiPaths } from "../../files/ProjektiPath";
import { auditLog } from "../../logger";
import { TilaManager } from "./TilaManager";

export abstract class KuulutusTilaManager<T extends GenericKuulutus, Y extends GenericDbKuulutusJulkaisu> extends TilaManager<T, Y> {
  protected tyyppi!: TilasiirtymaTyyppi;

  abstract getJulkaisut(projekti: DBProjekti): Y[] | undefined;

  async uudelleenkuuluta(projekti: DBProjekti): Promise<void> {
    requireAdmin();

    const kuulutusLuonnos = this.getVaihe(projekti);
    const julkaisut = this.getJulkaisut(projekti);
    const hyvaksyttyJulkaisu = findJulkaisuWithTila(julkaisut, KuulutusJulkaisuTila.HYVAKSYTTY);
    auditLog.info("Uudelleenkuuluta kuulutusvaihe", { julkaisu: hyvaksyttyJulkaisu });

    this.validateUudelleenkuulutus(projekti, kuulutusLuonnos, hyvaksyttyJulkaisu);
    assertIsDefined(julkaisut);
    assertIsDefined(kuulutusLuonnos);
    assertIsDefined(hyvaksyttyJulkaisu);

    const uusiKuulutus = this.getUpdatedVaiheTiedotForUudelleenkuulutus(projekti, kuulutusLuonnos, hyvaksyttyJulkaisu, julkaisut);

    const sourceFolder = this.getProjektiPathForKuulutus(projekti, hyvaksyttyJulkaisu);

    const targetFolder = this.getProjektiPathForKuulutus(projekti, uusiKuulutus);
    await fileService.copyYllapitoFolder(sourceFolder, targetFolder);
    auditLog.info("Kuulutusvaiheen uudelleenkuulutus onnistui", { sourceFolder, targetFolder });
    await this.saveVaihe(projekti, uusiKuulutus);
    auditLog.info("Tallenna uudelleenkuulutustiedolla varustettu kuulutusvaihe", {
      projektiEnnenTallennusta: projekti,
      tallennettavaKuulutus: uusiKuulutus,
    });
  }

  private getUpdatedVaiheTiedotForUudelleenkuulutus(projekti: DBProjekti, kuulutusLuonnos: T, hyvaksyttyJulkaisu: Y, julkaisut: Y[]) {
    const julkinenUudelleenKuulutus = isKuulutusPaivaInThePast(hyvaksyttyJulkaisu.kuulutusPaiva);
    const uudelleenKuulutus = julkinenUudelleenKuulutus
      ? {
          tila: UudelleenkuulutusTila.JULKAISTU_PERUUTETTU,
          alkuperainenHyvaksymisPaiva: hyvaksyttyJulkaisu.hyvaksymisPaiva || undefined,
        }
      : {
          tila: UudelleenkuulutusTila.PERUUTETTU,
        };

    const uusiId = julkaisut.length + 1;
    const projektiPaths = new ProjektiPaths(projekti.oid);
    const aineistot = this.getUpdatedAineistotForVaihe(kuulutusLuonnos, uusiId, projektiPaths);

    return { ...kuulutusLuonnos, uudelleenKuulutus, id: uusiId, ...aineistot };
  }

  protected updateAineistoArrayForUudelleenkuulutus(
    aineisto: Aineisto[] | null | undefined,
    oldPathPrefix: string,
    newPathPrefix: string
  ): Aineisto[] | null | undefined {
    return aineisto?.map<Aineisto>(({ tiedosto, ...muuttumattomatAineistoTiedot }) => ({
      tiedosto: tiedosto?.replace(oldPathPrefix, newPathPrefix),
      ...muuttumattomatAineistoTiedot,
    }));
  }

  abstract checkPriviledgesApproveReject(projekti: DBProjekti): NykyinenKayttaja;

  abstract checkPriviledgesSendForApproval(projekti: DBProjekti): NykyinenKayttaja;

  abstract checkUudelleenkuulutusPriviledges(projekti: DBProjekti): NykyinenKayttaja;

  abstract sendForApproval(projekti: DBProjekti, kayttaja: NykyinenKayttaja): Promise<void>;

  abstract getUpdatedAineistotForVaihe(vaihe: T, uusiId: number, paths: ProjektiPaths): Partial<T>;

  abstract reject(projekti: DBProjekti, syy: string | null | undefined): Promise<void>;

  abstract approve(projekti: DBProjekti, kayttaja: NykyinenKayttaja): Promise<void>;

  abstract validateUudelleenkuulutus(projekti: DBProjekti, kuulutus: T, hyvaksyttyJulkaisu: Y | undefined): void;

  abstract getProjektiPathForKuulutus(projekti: DBProjekti, kuulutus: T | Y | null | undefined): PathTuple;

  abstract saveVaihe(projekti: DBProjekti, newKuulutus: T): Promise<void>;
}
