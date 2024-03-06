import { fileService } from "../files/fileService";
import { testProjektiDatabase } from "../database/testProjektiDatabase";
import { projektiSchedulerService } from "../sqsEvents/projektiSchedulerService";
import { omistajaDatabase } from "../database/omistajaDatabase";
import { muistuttajaDatabase } from "../database/muistuttajaDatabase";

class ProjektiArchiveService {
  async archiveProjekti(oid: string): Promise<string> {
    await testProjektiDatabase.deleteProjektiByOid(oid);
    await fileService.deleteProjekti(oid);
    await projektiSchedulerService.deleteAllSchedules(oid);
    await omistajaDatabase.deleteOmistajatByOid(oid);
    await muistuttajaDatabase.deleteMuistuttajatByOid(oid);
    return oid;
  }
}

export const projektiArchive = new ProjektiArchiveService();
