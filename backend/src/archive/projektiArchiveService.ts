import { projektiDatabase } from "../database/projektiDatabase";
import { fileService } from "../files/fileService";

class ProjektiArchiveService {
  async archiveProjekti(oid: string): Promise<string> {
    await projektiDatabase.deleteProjektiByOid(oid);
    await fileService.deleteProjekti(oid);

    return oid;
  }
}

export const projektiArchive = new ProjektiArchiveService();
