import { Aineisto, NahtavillaoloVaiheJulkaisu, Vuorovaikutus } from "../database/model";
import { aineistoImporterClient } from "./aineistoImporterClient";
import { log } from "../logger";
import { fileService } from "../files/fileService";
import { getCloudFront } from "../aws/client";
import { config } from "../config";
import { parseDate } from "../util/dateUtil";
import { Dayjs } from "dayjs";
import { ImportAineistoEventType } from "./importAineistoEvent";

async function synchronizeAineistoToPublic(oid: string, aineistoPath: string, publishDate: Dayjs) {
  let hasChanges = false;
  const yllapitoFiles = await fileService.listYllapitoProjektiFiles(oid, aineistoPath);
  for (const fileName in yllapitoFiles) {
    const fullFileName = "/" + aineistoPath + fileName;
    const metadata = await fileService.getPublicFileMetadata(oid, fullFileName);
    const publishDateChanged = metadata && !metadata.publishDate.isSame(publishDate);
    if (!metadata || publishDateChanged) {
      // Public file is missing, so it needs to be published
      log.info("Publish:", fullFileName);
      await fileService.publishProjektiFile(oid, fullFileName, publishDate);
      hasChanges = true;
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
            Items: [fileService.getPublicPathForProjektiFile(oid, "/" + aineistoPath + "/*")],
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

  async publishNahtavillaolo(oid: string, nahtavillaoloId: number) {
    // Import files from Velho
    await aineistoImporterClient.importAineisto({
      type: ImportAineistoEventType.PUBLISH_NAHTAVILLAOLO,
      oid,
      publishNahtavillaoloWithId: nahtavillaoloId,
    });
  }

  /**
   * Copy aineisto to public S3 with proper publish and expiration dates
   */
  async synchronizeVuorovaikutusAineistoToPublic(oid: string, vuorovaikutus: Vuorovaikutus): Promise<void> {
    const publishDate = parseDate(vuorovaikutus.vuorovaikutusJulkaisuPaiva);
    if (!publishDate) {
      throw new Error("Vuorovaikutusta ei voi julkaista jos vuorovaikutusJulkaisuPaiva ei ole asetettu");
    }
    const vuorovaikutusPath = fileService.getVuorovaikutusPath(vuorovaikutus);
    await synchronizeAineistoToPublic(oid, vuorovaikutusPath, publishDate);
  }

  async synchronizeNahtavillaoloVaiheJulkaisuAineistoToPublic(oid: string, nahtavillaoloVaiheJulkaisu: NahtavillaoloVaiheJulkaisu): Promise<void> {
    const publishDate = parseDate(nahtavillaoloVaiheJulkaisu.kuulutusPaiva);
    if (!publishDate) {
      throw new Error("Nahtavillaoloaineistoa ei voi julkaista jos vuorovaikutusJulkaisuPaiva ei ole asetettu");
    }
    const nahtavillaoloVaihePath = fileService.getNahtavillaoloVaihePath(nahtavillaoloVaiheJulkaisu);
    await synchronizeAineistoToPublic(oid, nahtavillaoloVaihePath, publishDate);
  }

  async deleteAineisto(oid: string, aineisto: Aineisto) {
    log.info("Poistetaan aineisto", aineisto);
    await fileService.deleteYllapitoFileFromProjekti({
      oid,
      fullFilePathInProjekti: aineisto.tiedosto,
    });
    await fileService.deletePublicFileFromProjekti({
      oid,
      fullFilePathInProjekti: aineisto.tiedosto,
    });
  }
}

export const aineistoService = new AineistoService();
