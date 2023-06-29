import { Aineisto } from "../database/model";
import { log } from "../logger";
import { fileService } from "../files/fileService";

class AineistoService {
  async deleteAineisto(
    oid: string,
    aineisto: Aineisto,
    yllapitoFilePathInProjekti: string,
    publicFilePathInProjekti: string,
    reason: string
  ) {
    const fullFilePathInProjekti = aineisto.tiedosto;
    if (fullFilePathInProjekti) {
      // Do not try to delete file that was not yet imported to system
      log.info("Poistetaan aineisto", aineisto);
      await fileService.deleteYllapitoFileFromProjekti({
        oid,
        filePathInProjekti: fullFilePathInProjekti,
        reason,
      });

      // Transform yllapito file path to public one to support cases when they differ
      const publicFullFilePathInProjekti = fullFilePathInProjekti.replace(yllapitoFilePathInProjekti, publicFilePathInProjekti);
      await fileService.deletePublicFileFromProjekti({
        oid,
        filePathInProjekti: publicFullFilePathInProjekti,
        reason,
      });
    }
  }
}

export const aineistoService = new AineistoService();
