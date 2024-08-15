import { fileService } from "../files/fileService";
import { testProjektiDatabase } from "../database/testProjektiDatabase";
import { projektiSchedulerService } from "../sqsEvents/projektiSchedulerService";
import { omistajaDatabase } from "../database/omistajaDatabase";
import { muistuttajaDatabase } from "../database/muistuttajaDatabase";
import { log } from "../logger";

class ProjektiArchiveService {
  async archiveProjekti(oid: string): Promise<string> {
    await testProjektiDatabase.deleteProjektiByOid(oid);
    await fileService.deleteProjekti(oid);
    try {
      await projektiSchedulerService.deleteAllSchedules(oid);
    } catch (e) {
      // tämä saattaa epäonnistua development modessa koska arkistointia kutsutaan kahteen kertaan
      log.error("Ajastuksien poisto epäonnistui");
    }
    await omistajaDatabase.deleteOmistajatByOid(oid);
    await muistuttajaDatabase.deleteMuistuttajatByOid(oid);
    return oid;
  }
}

export const projektiArchive = new ProjektiArchiveService();
