import dayjs from "dayjs";
import { ArchivedProjektiKey, projektiDatabase } from "../database/projektiDatabase";
import { fileService } from "../files/fileService";

class ProjektiArchiveService {
  async archiveProjekti(oid: string): Promise<ArchivedProjektiKey> {
    const timestamp = dayjs().toISOString();
    const archivedProjektiKey = { oid, timestamp };
    await projektiDatabase.archiveProjektiByOid(archivedProjektiKey);

    await fileService.archiveProjekti(archivedProjektiKey);

    return archivedProjektiKey;
  }
}

export const projektiArchive = new ProjektiArchiveService();
