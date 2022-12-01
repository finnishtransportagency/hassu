import { fileService } from "../files/fileService";
import { testProjektiDatabase } from "../database/testProjektiDatabase";
import { aineistoSynchronizerService } from "../aineisto/aineistoSynchronizerService";

class ProjektiArchiveService {
  async archiveProjekti(oid: string): Promise<string> {
    await testProjektiDatabase.deleteProjektiByOid(oid);
    await fileService.deleteProjekti(oid);
    await aineistoSynchronizerService.deleteAllSchedules(oid);

    return oid;
  }
}

export const projektiArchive = new ProjektiArchiveService();
