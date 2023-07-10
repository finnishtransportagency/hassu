import { fileService } from "../files/fileService";
import { testProjektiDatabase } from "../database/testProjektiDatabase";
import { aineistoSynchronizationSchedulerService } from "../aineisto/aineistoSynchronizationSchedulerService";

class ProjektiArchiveService {
  async archiveProjekti(oid: string): Promise<string> {
    await testProjektiDatabase.deleteProjektiByOid(oid);
    await fileService.deleteProjekti(oid);
    await aineistoSynchronizationSchedulerService.deleteAllSchedules(oid);

    return oid;
  }
}

export const projektiArchive = new ProjektiArchiveService();
