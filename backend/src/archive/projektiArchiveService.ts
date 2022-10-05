import { fileService } from "../files/fileService";
import { testProjektiDatabase } from "../database/testProjektiDatabase";

class ProjektiArchiveService {
  async archiveProjekti(oid: string): Promise<string> {
    await testProjektiDatabase.deleteProjektiByOid(oid);
    await fileService.deleteProjekti(oid);

    return oid;
  }
}

export const projektiArchive = new ProjektiArchiveService();
