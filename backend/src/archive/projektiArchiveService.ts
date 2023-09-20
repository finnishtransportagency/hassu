import { fileService } from "../files/fileService";
import { testProjektiDatabase } from "../database/testProjektiDatabase";
import { projektiSchedulerService } from "../aineisto/projektiSchedulerService";

class ProjektiArchiveService {
  async archiveProjekti(oid: string): Promise<string> {
    await testProjektiDatabase.deleteProjektiByOid(oid);
    await fileService.deleteProjekti(oid);
    await projektiSchedulerService.deleteAllSchedules(oid);

    return oid;
  }
}

export const projektiArchive = new ProjektiArchiveService();
