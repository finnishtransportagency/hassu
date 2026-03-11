import { DBProjekti } from "../database/model";
import { testProjektiDatabase } from "../database/testProjektiDatabase";
import { fileService } from "../files/fileService";
import { ProjektiPaths } from "../files/ProjektiPath";
import { projektiDatabase } from "../database/projektiDatabase";
import { TestiKomentoVaihe } from "hassu-common/graphql/apiModel";
import { log } from "../logger";
import { projektiEntityDatabase } from "../database/projektiEntityDatabase";
import { nahtavillaoloVaiheJulkaisuDatabase } from "../database/nahtavillaoloVaiheJulkaisuDatabase";
import { groupProjektiEntitiesByType } from "../database/groupProjektiEntitiesByType";

async function requireProjekti(oid: string) {
  const projekti = await projektiDatabase.loadProjektiByOid(oid);
  if (!projekti) {
    throw new Error("Projektia ei löydy.");
  }
  return projekti;
}

const jatkoPaatos2VaiheFields: Partial<DBProjekti> = {
  jatkoPaatos2Vaihe: null,
};

const jatkoPaatos1VaiheFields: Partial<DBProjekti> = {
  jatkoPaatos1Vaihe: null,
  ...jatkoPaatos2VaiheFields,
};

const hyvaksymisPaatosVaiheFields: Partial<DBProjekti> = {
  hyvaksymisPaatosVaihe: null,
  ...jatkoPaatos1VaiheFields,
};

const nahtavillaoloVaiheFields: Partial<DBProjekti> = {
  nahtavillaoloVaihe: null,
  ...hyvaksymisPaatosVaiheFields,
};

const vuorovaikutusJulkaisuFields: Partial<DBProjekti> = {
  vuorovaikutusKierrosJulkaisut: null,
  ...nahtavillaoloVaiheFields,
};

const suunnitteluVaiheFields: Partial<DBProjekti> = {
  vuorovaikutusKierros: null,
  ...vuorovaikutusJulkaisuFields,
};

const aloituskuulutusFields: Partial<DBProjekti> = {
  aloitusKuulutus: null,
  aloitusKuulutusJulkaisut: null,
  ...suunnitteluVaiheFields,
};

class ProjektiResetTool {
  async resetAloituskuulutus(oid: string) {
    await requireProjekti(oid);
    await testProjektiDatabase.saveProjektiWithoutLocking({
      oid,
      ...aloituskuulutusFields,
      synkronoinnit: {},
    });
    const nahtavillaoloJulkaisut = await nahtavillaoloVaiheJulkaisuDatabase.getAllForProjekti(oid, true);
    await nahtavillaoloVaiheJulkaisuDatabase.deleteAll(nahtavillaoloJulkaisut);
    const entities = await projektiEntityDatabase.getAllForProjekti(oid, true);
    await projektiEntityDatabase.deleteAll(entities);
    await fileService.deleteProjektiFilesRecursively(new ProjektiPaths(oid), ProjektiPaths.PATH_ALOITUSKUULUTUS);
  }

  async resetSuunnittelu(oid: string) {
    await requireProjekti(oid);
    await testProjektiDatabase.saveProjektiWithoutLocking({
      oid,
      ...suunnitteluVaiheFields,
    });
    const nahtavillaoloJulkaisut = await nahtavillaoloVaiheJulkaisuDatabase.getAllForProjekti(oid, true);
    await nahtavillaoloVaiheJulkaisuDatabase.deleteAll(nahtavillaoloJulkaisut);
    const entities = await projektiEntityDatabase.getAllForProjekti(oid, true);
    await projektiEntityDatabase.deleteAll(entities);
    await fileService.deleteProjektiFilesRecursively(new ProjektiPaths(oid), ProjektiPaths.PATH_SUUNNITTELUVAIHE);
  }

  async resetVuorovaikutukset(oid: string) {
    await requireProjekti(oid);
    await testProjektiDatabase.saveProjektiWithoutLocking({
      oid,
      ...vuorovaikutusJulkaisuFields,
    });
    const nahtavillaoloJulkaisut = await nahtavillaoloVaiheJulkaisuDatabase.getAllForProjekti(oid, true);
    await nahtavillaoloVaiheJulkaisuDatabase.deleteAll(nahtavillaoloJulkaisut);
    const entities = await projektiEntityDatabase.getAllForProjekti(oid, true);
    await projektiEntityDatabase.deleteAll(entities);
  }

  async resetNahtavillaolo(oid: string) {
    await requireProjekti(oid);
    await testProjektiDatabase.saveProjektiWithoutLocking({
      oid,
      ...nahtavillaoloVaiheFields,
    });
    const nahtavillaoloJulkaisut = await nahtavillaoloVaiheJulkaisuDatabase.getAllForProjekti(oid, true);
    await nahtavillaoloVaiheJulkaisuDatabase.deleteAll(nahtavillaoloJulkaisut);
    const entities = await projektiEntityDatabase.getAllForProjekti(oid, true);
    await projektiEntityDatabase.deleteAll(entities);
    await fileService.deleteProjektiFilesRecursively(new ProjektiPaths(oid), ProjektiPaths.PATH_NAHTAVILLAOLO);
  }

  async resetHyvaksymisvaihe(oid: string) {
    await requireProjekti(oid);
    await testProjektiDatabase.saveProjektiWithoutLocking({
      oid,
      kasittelynTila: null,
      ...hyvaksymisPaatosVaiheFields,
    });
    const entities = await projektiEntityDatabase.getAllForProjekti(oid, true);
    await projektiEntityDatabase.deleteAll(entities);
    await fileService.deleteProjektiFilesRecursively(new ProjektiPaths(oid), ProjektiPaths.PATH_HYVAKSYMISPAATOS);
  }

  async resetJatkopaatos1vaihe(oid: string) {
    const dbProjekti = await requireProjekti(oid);
    const kasittelyntila = dbProjekti?.kasittelynTila;
    await testProjektiDatabase.saveProjektiWithoutLocking({
      oid,
      kasittelynTila: kasittelyntila?.hyvaksymispaatos
        ? {
            hyvaksymispaatos: kasittelyntila.hyvaksymispaatos,
            ensimmainenJatkopaatos: { asianumero: "", paatoksenPvm: "" },
            toinenJatkopaatos: { asianumero: "", paatoksenPvm: "" },
          }
        : null,
      ...jatkoPaatos1VaiheFields,
    });
    const entities = await projektiEntityDatabase.getAllForProjekti(oid, true);
    const groupedEntities = groupProjektiEntitiesByType(entities);
    await projektiEntityDatabase.deleteAll(
      [groupedEntities.jatkoPaatos1VaiheJulkaisut ?? [], groupedEntities.jatkoPaatos2VaiheJulkaisut ?? []].flat()
    );
    await fileService.deleteProjektiFilesRecursively(new ProjektiPaths(oid), ProjektiPaths.PATH_JATKOPAATOS1);
  }

  async reset(oid: string, vaihe: TestiKomentoVaihe | null | undefined) {
    if (!vaihe) {
      return;
    }
    log.info("Resetoidaan projekti", { oid, vaihe });
    switch (vaihe) {
      case TestiKomentoVaihe.ALOITUSKUULUTUS:
        return this.resetAloituskuulutus(oid);
      case TestiKomentoVaihe.SUUNNITTELU:
        return this.resetSuunnittelu(oid);
      case TestiKomentoVaihe.VUOROVAIKUTUKSET:
        return this.resetVuorovaikutukset(oid);
      case TestiKomentoVaihe.NAHTAVILLAOLO:
        return this.resetNahtavillaolo(oid);
      case TestiKomentoVaihe.HYVAKSYMISVAIHE:
        return this.resetHyvaksymisvaihe(oid);
      case TestiKomentoVaihe.JATKOPAATOS1VAIHE:
        return this.resetJatkopaatos1vaihe(oid);
    }
  }
}

export const projektiResetTool = new ProjektiResetTool();
