import { Aineisto } from "../database/model";
import { aineistoImporterClient } from "./aineistoImporterClient";
import { log } from "../logger";
import { fileService } from "../files/fileService";
import { getCloudFront } from "../aws/client";
import { config } from "../config";
import { ProjektiAdaptationResult } from "../handler/projektiAdapter";
import { parseDate } from "../util/dateUtil";

class AineistoService {
  async importAineisto(oid: string, vuorovaikutusNumero: number) {
    // Import files from Velho
    await aineistoImporterClient.importAineisto({
      oid,
      vuorovaikutusNumero,
    });
  }

  /**
   * Copy aineisto to public S3 with proper publish and expiration dates
   */
  async synchronizeVuorovaikutusAineistoToPublic(projektiAdaptationResult: ProjektiAdaptationResult): Promise<void> {
    const vuorovaikutus = projektiAdaptationResult.aineistoChanges.vuorovaikutus;
    const oid = projektiAdaptationResult.projekti.oid;
    let hasChanges = false;
    const publishDate = parseDate(vuorovaikutus.vuorovaikutusJulkaisuPaiva);
    if (!publishDate) {
      throw new Error("Vuorovaikutusta ei voi julkaista jos vuorovaikutusJulkaisuPaiva ei ole asetettu");
    }
    const vuorovaikutusPath = fileService.getVuorovaikutusPath(vuorovaikutus);

    const yllapitoFiles = await fileService.listYllapitoProjektiFiles(oid, vuorovaikutusPath);
    for (const fileName in yllapitoFiles) {
      const fullFileName = "/" + vuorovaikutusPath + fileName;
      const metadata = await fileService.getPublicFileMetadata(oid, fullFileName);
      if (!metadata) {
        // Public file is missing, so it needs to be published
        log.info("Publish:", fullFileName);
        await fileService.publishProjektiFile(oid, fullFileName, publishDate);
        hasChanges = true;
      }
    }

    const aineistotToDelete = projektiAdaptationResult.aineistoChanges.aineistotToDelete;
    if (aineistotToDelete && aineistotToDelete.length > 0) {
      // Delete files from public
      hasChanges = true;
      for (const fileNameToDelete of aineistotToDelete) {
        await fileService.deletePublicFileFromProjekti({
          oid,
          fullFilePathInProjekti: fileNameToDelete.tiedosto,
        });
      }
    }

    if (hasChanges) {
      await getCloudFront()
        .createInvalidation({
          DistributionId: config.cloudFrontDistributionId,
          InvalidationBatch: {
            CallerReference: "synchronizeVuorovaikutusAineistoToPublic" + new Date().getTime(),
            Paths: {
              Quantity: 1,
              Items: [
                fileService.getPublicPathForProjektiFile(
                  oid,
                  "/" + fileService.getVuorovaikutusPath(vuorovaikutus) + "/*"
                ),
              ],
            },
          },
        })
        .promise();
    }
  }

  async deleteAineisto(oid: string, aineistotToDelete: Aineisto[]) {
    for (const aineisto of aineistotToDelete) {
      log.info("Poistetaan aineisto", aineisto);
      await fileService.deleteYllapitoFileFromProjekti({
        oid,
        fullFilePathInProjekti: aineisto.tiedosto,
      });
    }
  }
}

export const aineistoService = new AineistoService();
