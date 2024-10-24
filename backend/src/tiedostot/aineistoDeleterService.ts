import { ImportContext } from "./importContext";
import { Status } from "hassu-common/graphql/apiModel";
import { ProjektiTiedostoManager } from "./ProjektiTiedostoManager";
import { projektiDatabase } from "../database/projektiDatabase";
import { fileService } from "../files/fileService";
import { JULKAISTU_HYVAKSYMISESITYS_PATH, MUOKATTAVA_HYVAKSYMISESITYS_PATH } from "./paths";

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

      const s3PathsForRecursiveDelete = [
        JULKAISTU_HYVAKSYMISESITYS_PATH,
        MUOKATTAVA_HYVAKSYMISESITYS_PATH,
        "hyvaksymisesityksen_spostit",
        "lausuntopyynto",
        "lausuntopyynnon_taydennys",
      ];

      await Promise.all(
        s3PathsForRecursiveDelete.map(async (path) => {
          const files = await fileService.listYllapitoProjektiFiles(ctx.oid, path);
          for (const fileName in files) {
            await fileService.deleteYllapitoFileFromProjekti({
              oid: ctx.oid,
              filePathInProjekti: "/" + path + fileName,
              reason: "Projekti epäaktiivinen",
            });
          }
        })
      );

      await projektiDatabase.removeProjektiAttributesFromEpaaktiivinenProjekti(ctx.oid);
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
}

export const aineistoDeleterService = new AineistoDeleterService();
