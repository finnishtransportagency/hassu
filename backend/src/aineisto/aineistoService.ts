import { Aineisto } from "../database/model";
import { aineistoImporterClient } from "./aineistoImporterClient";
import { log } from "../logger";
import { FileMap, fileService, FileType } from "../files/fileService";
import { getCloudFront } from "../aws/clients/getCloudFront";
import { config } from "../config";
import { Dayjs } from "dayjs";
import { ImportAineistoEventType } from "./importAineistoEvent";
import { PathTuple, ProjektiPaths } from "../files/ProjektiPath";
import { detailedDiff } from "deep-object-diff";
import { nyt } from "../util/dateUtil";

function checkIfFileNeedsPublishing(fileName: string, yllapitoFiles: FileMap, publicFiles: FileMap) {
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

export async function synchronizeFilesToPublic(
  oid: string,
  paths: PathTuple,
  publishDate: Dayjs | undefined,
  expirationDate?: Dayjs
): Promise<boolean> {
  let hasChanges = false;
  const yllapitoFiles = await fileService.listYllapitoProjektiFiles(oid, paths.yllapitoPath);
  const publicFiles = await fileService.listPublicProjektiFiles(oid, paths.publicPath, true);
  const expirationTimeIsInThePast = expirationDate && expirationDate.isBefore(nyt());
  if (publishDate) {
    // Jos publishDate ei ole annettu, julkaisun sijaan poistetaan kaikki julkiset tiedostot
    for (const fileName in yllapitoFiles) {
      const fileNameYllapito = "/" + paths.yllapitoPath + fileName;
      const fileNamePublic = "/" + paths.publicPath + fileName;

      const yllapitoFileMetadata = yllapitoFiles[fileName];
      yllapitoFileMetadata.publishDate = publishDate; // Ylikirjoita annettu julkaisupäivä, jotta alempana isSame-funktio olisi käytettävissä
      if (yllapitoFileMetadata.fileType == FileType.AINEISTO) {
        // Poistumispäivä koskee vain aineistoja
        if (expirationTimeIsInThePast) {
          // Poistetaan julkiset aineistot
          continue;
        }
        yllapitoFileMetadata.expirationDate = expirationDate;
      }
      if (checkIfFileNeedsPublishing(fileName, yllapitoFiles, publicFiles)) {
        // Public file is missing, so it needs to be published
        await fileService.publishProjektiFile(oid, fileNameYllapito, fileNamePublic, yllapitoFileMetadata);
        hasChanges = true;
      }
      delete publicFiles[fileName]; // Poista julkinen tiedosto listasta, jotta ylimääräiset tiedostot voidaan myöhemmin poistaa
    }
  }

  // Poistetaan ylimääräiset tiedostot kansalaispuolelta
  for (const fileName in publicFiles) {
    await fileService.deletePublicFileFromProjekti({
      oid,
      filePathInProjekti: "/" + paths.publicPath + fileName,
      reason: "Tiedosto ei ole enää julkaistu",
    });
    hasChanges = true;
  }

  if (hasChanges) {
    if (!config.cloudFrontDistributionId) {
      throw new Error("config.cloudFrontDistributionId määrittelemättä");
    }
    try {
      await getCloudFront().createInvalidation({
        DistributionId: config.cloudFrontDistributionId,
        InvalidationBatch: {
          CallerReference: "synchronizeAineistoToPublic" + new Date().getTime(),
          Paths: {
            Quantity: 1,
            Items: ["/" + fileService.getPublicPathForProjektiFile(new ProjektiPaths(oid), "/" + paths.publicPath + "/*")],
          },
        },
      });
    } catch (e) {
      log.error(e);
      return false;
    }
  }
  return true;
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
