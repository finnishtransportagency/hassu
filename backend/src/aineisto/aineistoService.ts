import { Aineisto } from "../database/model";
import { aineistoImporterClient } from "./aineistoImporterClient";
import { log } from "../logger";
import { FileMap, fileService } from "../files/fileService";
import { ImportAineistoEventType } from "./importAineistoEvent";
import { detailedDiff } from "deep-object-diff";

export function checkIfFileNeedsPublishing(fileName: string, yllapitoFiles: FileMap, publicFiles: FileMap): boolean {
  const existingPublicFileMetadata = publicFiles[fileName];
  const msgPrefix = "Synkronoidaan '" + fileName + "' kansalaisille, koska ";
  if (!existingPublicFileMetadata) {
    log.info(msgPrefix + "tiedosto puuttuu kansalaispuolelta");
    return true;
  }

  const yllapitoMetaData = yllapitoFiles[fileName];
  if (!yllapitoMetaData.isSame(existingPublicFileMetadata)) {
    const difference = detailedDiff(yllapitoMetaData, existingPublicFileMetadata);
    log.info(msgPrefix + "tiedoston metadata on muuttunut", { difference, yllapitoMetaData, existingPublicFileMetadata });
    return true;
  }
  return false;
}

class AineistoService {
  async importAineisto(oid: string) {
    // Import files from Velho
    await aineistoImporterClient.importAineisto({
      type: ImportAineistoEventType.IMPORT,
      oid,
    });
  }

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
