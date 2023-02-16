import { Aineisto } from "../database/model";
import { aineistoImporterClient } from "./aineistoImporterClient";
import { log } from "../logger";
import { fileService, FileType } from "../files/fileService";
import { getCloudFront } from "../aws/clients/getCloudFront";
import { config } from "../config";
import dayjs, { Dayjs } from "dayjs";
import { ImportAineistoEventType } from "./importAineistoEvent";
import { PathTuple, ProjektiPaths } from "../files/ProjektiPath";

export async function synchronizeFilesToPublic(
  oid: string,
  paths: PathTuple,
  publishDate: Dayjs | undefined,
  expirationDate?: Dayjs
): Promise<void> {
  let hasChanges = false;
  const yllapitoFiles = await fileService.listYllapitoProjektiFiles(oid, paths.yllapitoPath);
  const publicFiles = await fileService.listPublicProjektiFiles(oid, paths.publicPath, true);
  const expirationDateEndOfDay = expirationDate ? expirationDate.endOf("day") : undefined
  const expirationTimeIsInThePast = expirationDateEndOfDay && expirationDateEndOfDay.isBefore(dayjs());
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
        yllapitoFileMetadata.expirationDate = expirationDateEndOfDay;
      }
      const existingPublicFileMetadata = publicFiles[fileName];
      delete publicFiles[fileName]; // Poista julkinen tiedosto listasta, jotta ylimääräiset tiedostot voidaan myöhemmin poistaa
      const publicFileMissing = !existingPublicFileMetadata;

      const metadataChanged = publicFileMissing || !yllapitoFiles[fileName].isSame(existingPublicFileMetadata);
      if (metadataChanged) {
        // Public file is missing, so it needs to be published
        log.info("Publish:", fileNameYllapito);
        await fileService.publishProjektiFile(oid, fileNameYllapito, fileNamePublic, yllapitoFileMetadata);
        hasChanges = true;
      }
    }
  }

  // Poistetaan ylimääräiset tiedostot kansalaispuolelta
  for (const fileName in publicFiles) {
    await fileService.deletePublicFileFromProjekti({ oid, filePathInProjekti: "/" + paths.publicPath + fileName });
    hasChanges = true;
  }

  if (hasChanges) {
    if (!config.cloudFrontDistributionId) {
      throw new Error("config.cloudFrontDistributionId määrittelemättä");
    }
    await getCloudFront()
      .createInvalidation({
        DistributionId: config.cloudFrontDistributionId,
        InvalidationBatch: {
          CallerReference: "synchronizeAineistoToPublic" + new Date().getTime(),
          Paths: {
            Quantity: 1,
            Items: ["/" + fileService.getPublicPathForProjektiFile(new ProjektiPaths(oid), "/" + paths.publicPath + "/*")],
          },
        },
      })
      .promise();
  }
}

class AineistoService {
  async importAineisto(oid: string) {
    // Import files from Velho
    await aineistoImporterClient.importAineisto({
      type: ImportAineistoEventType.IMPORT,
      oid,
    });
  }

  async deleteAineisto(oid: string, aineisto: Aineisto, yllapitoFilePathInProjekti: string, publicFilePathInProjekti: string) {
    const fullFilePathInProjekti = aineisto.tiedosto;
    if (fullFilePathInProjekti) {
      // Do not try to delete file that was not yet imported to system
      log.info("Poistetaan aineisto", aineisto);
      await fileService.deleteYllapitoFileFromProjekti({
        oid,
        filePathInProjekti: fullFilePathInProjekti,
      });

      // Transform yllapito file path to public one to support cases when they differ
      const publicFullFilePathInProjekti = fullFilePathInProjekti.replace(yllapitoFilePathInProjekti, publicFilePathInProjekti);
      await fileService.deletePublicFileFromProjekti({
        oid,
        filePathInProjekti: publicFullFilePathInProjekti,
      });
    }
  }
}

export const aineistoService = new AineistoService();
