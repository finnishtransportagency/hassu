import { ImportContext } from "./importContext";
import { Status } from "hassu-common/graphql/apiModel";
import { ProjektiTiedostoManager } from "./ProjektiTiedostoManager";
import { projektiDatabase } from "../database/projektiDatabase";
import {
  HYVAKSYMISESITYS_TIEDOSTO_KEYS,
  HyvaksymisesitysKey,
  HyvaksymisesitysTiedostoKey,
  IHyvaksymisEsitys,
  LadattuTiedosto,
} from "../database/model";
import { fileService } from "../files/fileService";
import { getYllapitoPathForProjekti, joinPath, JULKAISTU_HYVAKSYMISESITYS_PATH, MUOKATTAVA_HYVAKSYMISESITYS_PATH } from "./paths";

const hyvaksymisesitysKeyToS3Path: Record<HyvaksymisesitysKey, string> = {
  julkaistuHyvaksymisEsitys: JULKAISTU_HYVAKSYMISESITYS_PATH,
  muokattavaHyvaksymisEsitys: MUOKATTAVA_HYVAKSYMISESITYS_PATH,
};

class AineistoDeleterService {
  async deleteAineistoIfEpaaktiivinen(ctx: ImportContext) {
    const manager: ProjektiTiedostoManager = ctx.manager;
    if ([Status.EPAAKTIIVINEN_1, Status.EPAAKTIIVINEN_2, Status.EPAAKTIIVINEN_3].includes(ctx.projektiStatus)) {
      // Poista aineisto epäaktiivinent1 edeltävistä tiloista

      await Promise.all(
        (
          await manager.getAloitusKuulutusVaihe().deleteAineistotIfEpaaktiivinen(ctx.projektiStatus)
        ).map((julkaisu) => projektiDatabase.aloitusKuulutusJulkaisut.update(ctx.projekti, julkaisu))
      );

      await Promise.all(
        (
          await manager.getVuorovaikutusKierros().deleteAineistotIfEpaaktiivinen(ctx.projektiStatus)
        ).map((julkaisu) => projektiDatabase.vuorovaikutusKierrosJulkaisut.update(ctx.projekti, julkaisu))
      );

      await Promise.all(
        (
          await manager.getNahtavillaoloVaihe().deleteAineistotIfEpaaktiivinen(ctx.projektiStatus)
        ).map((julkaisu) => projektiDatabase.nahtavillaoloVaiheJulkaisut.update(ctx.projekti, julkaisu))
      );

      await Promise.all(
        (
          await manager.getHyvaksymisPaatosVaihe().deleteAineistotIfEpaaktiivinen(ctx.projektiStatus)
        ).map((julkaisu) => projektiDatabase.hyvaksymisPaatosVaiheJulkaisut.update(ctx.projekti, julkaisu))
      );

      await this.deleteLausuntopyyntoFiles(ctx);
      await this.deleteLausuntopyynnonTaydennysFiles(ctx);
      await this.deleteHyvaksymisesitysFiles("muokattavaHyvaksymisEsitys", ctx);
      await this.deleteHyvaksymisesitysFiles("julkaistuHyvaksymisEsitys", ctx);

      await projektiDatabase.deleteProjektiAttributesFromEpaaktiivinenProjekti(ctx.oid);
    }
    if ([Status.EPAAKTIIVINEN_2, Status.EPAAKTIIVINEN_3].includes(ctx.projektiStatus)) {
      await Promise.all(
        (
          await manager.getJatkoPaatos1Vaihe().deleteAineistotIfEpaaktiivinen(ctx.projektiStatus)
        ).map((julkaisu) => projektiDatabase.jatkoPaatos1VaiheJulkaisut.update(ctx.projekti, julkaisu))
      );
    }
    if (ctx.projektiStatus === Status.EPAAKTIIVINEN_3) {
      await Promise.all(
        (
          await manager.getJatkoPaatos2Vaihe().deleteAineistotIfEpaaktiivinen(ctx.projektiStatus)
        ).map((julkaisu) => projektiDatabase.jatkoPaatos2VaiheJulkaisut.update(ctx.projekti, julkaisu))
      );
    }
  }

  private async deleteHyvaksymisesitysFiles(hyvaksymisesitysKey: HyvaksymisesitysKey, ctx: ImportContext) {
    const hyvaksymisesitys: IHyvaksymisEsitys | null | undefined = ctx.projekti?.[hyvaksymisesitysKey];

    if (!hyvaksymisesitys) {
      return;
    }

    await Promise.all(
      HYVAKSYMISESITYS_TIEDOSTO_KEYS.map(async (key) => {
        await this.deleteFilesFromHyvaksymisesitys(hyvaksymisesitysKey, key, ctx);
      })
    );
  }

  private async deleteLausuntopyynnonTaydennysFiles(ctx: ImportContext): Promise<void> {
    const lausuntoPyynnonTaydennykset = ctx.projekti.lausuntoPyynnonTaydennykset;
    if (!lausuntoPyynnonTaydennykset) {
      return;
    }
    await Promise.all(
      lausuntoPyynnonTaydennykset?.map(async (lausuntopyynnonTaydennys) => {
        if (this.fileNeedsToBeDeleted(lausuntopyynnonTaydennys.aineistopaketti)) {
          await this.deleteFile(lausuntopyynnonTaydennys.aineistopaketti, ctx.oid);
        }
        await this.deleteFilesFromLadatutTiedostotArray(lausuntopyynnonTaydennys.muistutukset, ctx);
      })
    );
  }

  private async deleteLausuntopyyntoFiles(ctx: ImportContext): Promise<void> {
    const lausuntoPyynnot = ctx.projekti.lausuntoPyynnot;
    if (!lausuntoPyynnot) {
      return;
    }
    await Promise.all(
      lausuntoPyynnot.map(async (lausuntopyynto) => {
        if (this.fileNeedsToBeDeleted(lausuntopyynto.aineistopaketti)) {
          await this.deleteFile(lausuntopyynto.aineistopaketti, ctx.oid);
        }
        await this.deleteFilesFromLadatutTiedostotArray(lausuntopyynto.lisaAineistot, ctx);
      })
    );
  }

  private async deleteFilesFromLadatutTiedostotArray(ladatutTiedostot: LadattuTiedosto[] | undefined, ctx: ImportContext): Promise<void> {
    if (!ladatutTiedostot) {
      return;
    }
    await Promise.all(
      ladatutTiedostot
        .filter((tiedosto) => this.fileNeedsToBeDeleted(tiedosto.tiedosto))
        .map(async (tiedosto) => {
          await this.deleteFile(tiedosto.tiedosto, ctx.oid);
        })
    );
  }

  private async deleteFilesFromHyvaksymisesitys(
    hyvaksymisesitysKey: HyvaksymisesitysKey,
    tiedostoArrayKey: HyvaksymisesitysTiedostoKey,
    ctx: ImportContext
  ): Promise<void> {
    const ladatutTiedostot = ctx.projekti.julkaistuHyvaksymisEsitys?.[tiedostoArrayKey];
    if (!ladatutTiedostot) {
      return;
    }
    await Promise.all(
      ladatutTiedostot.map(async (aineisto) => {
        const path = joinPath(
          getYllapitoPathForProjekti(ctx.projekti.oid),
          hyvaksymisesitysKeyToS3Path[hyvaksymisesitysKey],
          tiedostoArrayKey,
          aineisto.nimi
        );
        await this.deleteFile(path, ctx.oid);
      })
    );
  }

  private fileNeedsToBeDeleted(filepath: string | undefined | null): filepath is string {
    return !!filepath;
  }

  private async deleteFile(filepath: string, oid: string) {
    await fileService.deleteYllapitoFileFromProjekti({
      filePathInProjekti: filepath,
      reason: "Projekti on epäaktiivinen",
      oid,
    });
  }
}

export const aineistoDeleterService = new AineistoDeleterService();
