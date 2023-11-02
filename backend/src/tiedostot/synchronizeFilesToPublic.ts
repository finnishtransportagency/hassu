import { log } from "../logger";
import { FileMap, fileService, FileType } from "../files/fileService";
import { getCloudFront } from "../aws/clients/getCloudFront";
import { config } from "../config";
import { Dayjs } from "dayjs";
import { PathTuple, ProjektiPaths } from "../files/ProjektiPath";
import { nyt } from "../util/dateUtil";
import { detailedDiff } from "deep-object-diff";

class PublicFileSynchronizer {
  private readonly oid: string;
  private paths: PathTuple;
  private readonly publishDate: Dayjs | undefined;
  private readonly expirationDate: Dayjs | undefined;
  private hasChanges = false;

  constructor(oid: string, paths: PathTuple, publishDate: Dayjs | undefined, expirationDate?: Dayjs) {
    this.oid = oid;
    this.publishDate = publishDate;
    this.paths = paths;
    this.expirationDate = expirationDate;
  }

  async synchronize(): Promise<boolean> {
    this.hasChanges = false;
    const yllapitoFiles = await fileService.listYllapitoProjektiFiles(this.oid, this.paths.yllapitoPath);
    const publicFiles = await fileService.listPublicProjektiFiles(this.oid, this.paths.publicPath, true);
    const expirationTimeIsInThePast = this.expirationDate?.isBefore(nyt());
    if (this.publishDate) {
      // Jos publishDate ei ole annettu, julkaisun sijaan poistetaan kaikki julkiset tiedostot
      await this.handleFilesInYllapito(yllapitoFiles, expirationTimeIsInThePast, publicFiles);
    }

    // Poistetaan ylimääräiset tiedostot kansalaispuolelta
    await this.deleteRemainingPublicFiles(publicFiles);

    if (this.hasChanges) {
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
              Items: ["/" + fileService.getPublicPathForProjektiFile(new ProjektiPaths(this.oid), "/" + this.paths.publicPath + "/*")],
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

  private async handleFilesInYllapito(
    yllapitoFiles: FileMap,
    expirationTimeIsInThePast: boolean | undefined,
    publicFiles: FileMap
  ): Promise<void> {
    for (const fileName in yllapitoFiles) {
      const fileNameYllapito = "/" + this.paths.yllapitoPath + fileName;
      const fileNamePublic = "/" + this.paths.publicPath + fileName;

      const yllapitoFileMetadata = yllapitoFiles[fileName];
      yllapitoFileMetadata.publishDate = this.publishDate; // Ylikirjoita annettu julkaisupäivä, jotta alempana isSame-funktio olisi käytettävissä
      if (yllapitoFileMetadata.fileType == FileType.AINEISTO) {
        // Poistumispäivä koskee vain aineistoja
        if (expirationTimeIsInThePast) {
          // Poistetaan julkiset aineistot
          continue;
        }
        yllapitoFileMetadata.expirationDate = this.expirationDate;
      }
      if (checkIfFileNeedsPublishing(fileName, yllapitoFiles, publicFiles)) {
        // Public file is missing, so it needs to be published
        await fileService.publishProjektiFile(this.oid, fileNameYllapito, fileNamePublic, yllapitoFileMetadata);
        this.hasChanges = true;
      }
      delete publicFiles[fileName];
    }
  }

  private async deleteRemainingPublicFiles(publicFiles: FileMap): Promise<void> {
    for (const fileName in publicFiles) {
      await fileService.deletePublicFileFromProjekti({
        oid: this.oid,
        filePathInProjekti: "/" + this.paths.publicPath + fileName,
        reason: "Tiedosto ei ole enää julkaistu",
      });
      this.hasChanges = true;
    }
  }
}

export async function synchronizeFilesToPublic(
  oid: string,
  paths: PathTuple,
  publishDate: Dayjs | undefined,
  expirationDate?: Dayjs
): Promise<boolean> {
  return await new PublicFileSynchronizer(oid, paths, publishDate, expirationDate).synchronize();
}

function checkIfFileNeedsPublishing(fileName: string, yllapitoFiles: FileMap, publicFiles: FileMap): boolean {
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
