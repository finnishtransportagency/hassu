import dayjs from "dayjs";
import { DBProjekti } from "../../database/model";
import { ProjektiPaths } from "../../files/ProjektiPath";
import { projektiSearchService } from "../../projektiSearch/projektiSearchService";
import { ProjektiTiedostoManager } from "../../tiedostot/ProjektiTiedostoManager";
import { aineistoDeleterService } from "../../tiedostot/aineistoDeleterService";
import { ImportContext } from "../../tiedostot/importContext";
import { synchronizeFilesToPublic } from "../../tiedostot/synchronizeFilesToPublic";
import * as API from "hassu-common/graphql/apiModel";

export async function handleSynchronizeAndIndex(projekti: DBProjekti): Promise<boolean> {
  const ctx = await new ImportContext(projekti).init();
  await aineistoDeleterService.deleteAineistoIfEpaaktiivinen(ctx);
  await projektiSearchService.indexProjekti(projekti);
  return await synchronizeAll(ctx);
}

async function synchronizeAll(ctx: ImportContext): Promise<boolean> {
  await synchronizeEULogot(ctx);
  await synchronizeKuntaLogo(ctx);

  const manager: ProjektiTiedostoManager = ctx.manager;
  return (
    (await manager.getAloitusKuulutusVaihe().synchronize()) &&
    (await manager.getVuorovaikutusKierros().synchronize()) &&
    (await manager.getNahtavillaoloVaihe().synchronize()) &&
    (await manager.getHyvaksymisPaatosVaihe().synchronize()) &&
    (await manager.getJatkoPaatos1Vaihe().synchronize()) &&
    (await manager.getJatkoPaatos2Vaihe().synchronize())
  );
}

async function synchronizeEULogot(ctx: ImportContext) {
  // Projekti status should at least be published (aloituskuulutus) until the logo is published to public
  const julkinenStatus = ctx.julkinenStatus;
  const projekti = ctx.projekti;
  if (
    projekti.euRahoitusLogot &&
    julkinenStatus &&
    julkinenStatus !== API.Status.EI_JULKAISTU &&
    julkinenStatus !== API.Status.EI_JULKAISTU_PROJEKTIN_HENKILOT
  ) {
    await synchronizeFilesToPublic(projekti.oid, new ProjektiPaths(projekti.oid).euLogot(), dayjs("2000-01-01"));
  }
}

async function synchronizeKuntaLogo(ctx: ImportContext) {
  const logoFilePath = ctx.projekti.suunnitteluSopimus?.logo;
  const status = ctx.projektiStatus;
  const projekti = ctx.projekti;
  if (logoFilePath && status && status !== API.Status.EI_JULKAISTU && status !== API.Status.EI_JULKAISTU_PROJEKTIN_HENKILOT) {
    await synchronizeFilesToPublic(projekti.oid, new ProjektiPaths(projekti.oid).suunnittelusopimus(), dayjs("2000-01-01"));
  }
}
