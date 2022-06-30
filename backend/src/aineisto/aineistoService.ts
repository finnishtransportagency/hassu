import { Aineisto, NahtavillaoloVaiheJulkaisu, Vuorovaikutus } from "../database/model";
import { aineistoImporterClient } from "./aineistoImporterClient";
import { log } from "../logger";
import { fileService } from "../files/fileService";
import { getCloudFront } from "../aws/client";
import { config } from "../config";
import { parseDate } from "../util/dateUtil";
import { Dayjs } from "dayjs";
import { ImportAineistoEventType } from "./importAineistoEvent";
import { PathTuple, ProjektiPaths } from "../files/ProjektiPath";

async function synchronizeAineistoToPublic(oid: string, paths: PathTuple, publishDate: Dayjs) {
  let hasChanges = false;
  const yllapitoFiles = await fileService.listYllapitoProjektiFiles(oid, paths.yllapitoPath);
  for (const fileName in yllapitoFiles) {
    const fileNameYllapito = "/" + paths.yllapitoPath + fileName;
    const fileNamePublic = "/" + paths.publicPath + fileName;
    const metadata = await fileService.getPublicFileMetadata(oid, fileNameYllapito);
    const publishDateChanged = metadata && !metadata.publishDate.isSame(publishDate);
    if (!metadata || publishDateChanged) {
      // Public file is missing, so it needs to be published
      log.info("Publish:", fileNameYllapito);
      await fileService.publishProjektiFile(oid, fileNameYllapito, fileNamePublic, publishDate);
      hasChanges = true;
    }
  }

  if (hasChanges) {
    await getCloudFront()
      .createInvalidation({
        DistributionId: config.cloudFrontDistributionId,
        InvalidationBatch: {
          CallerReference: "synchronizeAineistoToPublic" + new Date().getTime(),
          Paths: {
            Quantity: 1,
            Items: [fileService.getPublicPathForProjektiFile(oid, "/" + paths.publicPath + "/*")],
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
    const vuorovaikutusPaths = new ProjektiPaths(oid).vuorovaikutus(vuorovaikutus);
    await synchronizeAineistoToPublic(oid, vuorovaikutusPaths, publishDate);
  }

  async synchronizeNahtavillaoloVaiheJulkaisuAineistoToPublic(
    oid: string,
    nahtavillaoloVaiheJulkaisu: NahtavillaoloVaiheJulkaisu
  ): Promise<void> {
    const publishDate = parseDate(nahtavillaoloVaiheJulkaisu.kuulutusPaiva);
    if (!publishDate) {
      throw new Error("Nahtavillaoloaineistoa ei voi julkaista jos vuorovaikutusJulkaisuPaiva ei ole asetettu");
    }
    await synchronizeAineistoToPublic(
      oid,
      new ProjektiPaths(oid).nahtavillaoloVaihe(nahtavillaoloVaiheJulkaisu),
      publishDate
    );
  }

  async deleteAineisto(
    oid: string,
    aineisto: Aineisto,
    yllapitoFilePathInProjekti: string,
    publicFilePathInProjekti: string
  ) {
    const fullFilePathInProjekti = aineisto.tiedosto;
    if (fullFilePathInProjekti) {
      // Do not try to delete file that was not yet imported to system
      log.info("Poistetaan aineisto", aineisto);
      await fileService.deleteYllapitoFileFromProjekti({
        oid,
        filePathInProjekti: fullFilePathInProjekti,
      });

      // Transform yllapito file path to public one to support cases when they differ
      const publicFullFilePathInProjekti = fullFilePathInProjekti.replace(
        yllapitoFilePathInProjekti,
        publicFilePathInProjekti
      );
      await fileService.deletePublicFileFromProjekti({
        oid,
        filePathInProjekti: publicFullFilePathInProjekti,
      });
    }
  }
}

export const aineistoService = new AineistoService();
