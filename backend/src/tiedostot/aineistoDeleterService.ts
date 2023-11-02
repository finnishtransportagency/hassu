import { ImportContext } from "./importContext";
import { Status } from "hassu-common/graphql/apiModel";
import { ProjektiTiedostoManager } from "./ProjektiTiedostoManager";
import { projektiDatabase } from "../database/projektiDatabase";

class AineistoDeleterService {
  async deleteAineistoIfEpaaktiivinen(ctx: ImportContext) {
    if (ctx.projektiStatus == Status.EPAAKTIIVINEN_1) {
      // Poista aineisto epäaktiivinent1 edeltävistä tiloista

      const manager: ProjektiTiedostoManager = ctx.manager;

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
    }
  }
}

export const aineistoDeleterService = new AineistoDeleterService();
