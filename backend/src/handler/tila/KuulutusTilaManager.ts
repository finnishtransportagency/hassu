import { DBProjekti, UudelleenkuulutusTila } from "../../database/model";
import { requireAdmin } from "../../user/userService";
import { KuulutusJulkaisuTila, NykyinenKayttaja, TilasiirtymaTyyppi } from "../../../../common/graphql/apiModel";
import { findJulkaisuWithTila, GenericKuulutus, GenericDbKuulutusJulkaisu } from "../../projekti/projektiUtil";
import { assertIsDefined } from "../../util/assertions";
import { isKuulutusPaivaInThePast } from "../../projekti/status/projektiJulkinenStatusHandler";
import { fileService } from "../../files/fileService";
import { PathTuple } from "../../files/ProjektiPath";
import { auditLog } from "../../logger";
import { TilaManager } from "./TilaManager";

export abstract class KuulutusTilaManager<T extends GenericKuulutus, Y extends GenericDbKuulutusJulkaisu> extends TilaManager {
  protected tyyppi!: TilasiirtymaTyyppi;

  abstract getVaihe(projekti: DBProjekti): T;

  abstract getJulkaisut(projekti: DBProjekti): Y[] | undefined;

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
    const newKuulutus = { ...kuulutus, id: julkaisut.length + 1 };
    const sourceFolder = this.getProjektiPathForKuulutus(projekti, kuulutus);

    const targetFolder = this.getProjektiPathForKuulutus(projekti, newKuulutus);
    await fileService.renameYllapitoFolder(sourceFolder, targetFolder);
    auditLog.info("Uudelleennimeä ylläpidon tiedostokansio", { sourceFolder, targetFolder });
    await this.saveVaihe(projekti, newKuulutus);
    auditLog.info("Tallenna uudelleenkuulutustiedolla varustettu kuulutusvaihe", {
      projektiEnnenTallennusta: projekti,
      tallennettavaKuulutus: newKuulutus,
    });
  }

  abstract checkPriviledgesApproveReject(projekti: DBProjekti): NykyinenKayttaja;

  abstract checkPriviledgesSendForApproval(projekti: DBProjekti): NykyinenKayttaja;

  abstract checkUudelleenkuulutusPriviledges(projekti: DBProjekti): NykyinenKayttaja;

  abstract sendForApproval(projekti: DBProjekti, kayttaja: NykyinenKayttaja): Promise<void>;

  abstract reject(projekti: DBProjekti, syy: string | null | undefined): Promise<void>;

  abstract approve(projekti: DBProjekti, kayttaja: NykyinenKayttaja): Promise<void>;

  abstract validateUudelleenkuulutus(projekti: DBProjekti, kuulutus: T, hyvaksyttyJulkaisu: Y | undefined): void;

  abstract getProjektiPathForKuulutus(projekti: DBProjekti, kuulutus: T | null | undefined): PathTuple;

  abstract saveVaihe(projekti: DBProjekti, newKuulutus: T): Promise<void>;
}
