// Contains code generated or recommended by Amazon Q
import { invokeLambda } from "../aws/lambda";
import { parameters } from "../aws/parameters";
import { log } from "../logger";
import { ProjektiPaths } from "./ProjektiPath";
import { config } from "../config";
import { fileService } from "./fileService";
import { LiitteenSkannausTulos } from "hassu-common/graphql/apiModel";
import { getS3Client } from "../aws/client";
import { GetObjectTaggingCommand } from "@aws-sdk/client-s3";

class VirusScanService {
  async runScanOnFile(bucketName: string, key: string) {
    try {
      const virusScannerLambdaArn = await parameters.getParameter("VirusScannerLambdaArn");
      if (virusScannerLambdaArn) {
        const payload = {
          Records: [
            {
              s3: {
                bucket: {
                  name: bucketName,
                },
                object: {
                  key,
                },
              },
            },
          ],
        };
        log.info("Käynnistetään virusskannaus", { payload });
        await invokeLambda(virusScannerLambdaArn, false, JSON.stringify(payload));
      }
    } catch (e) {
      log.error(e);
      // Älä palauta virhettä kansalaiselle käyttöliittymään
    }
  }

  // Käytetään palautteille: lukee ulkoisen VirusScannerLambdan asettaman "viruscan"-tagin (toinen AWS-tili)
  async getVirusScanResult(path: ProjektiPaths, liite: string | null | undefined): Promise<LiitteenSkannausTulos | undefined> {
    if (liite) {
      const s3 = getS3Client();
      const tagResponse = await s3.send(
        new GetObjectTaggingCommand({
          Bucket: config.yllapitoBucketName,
          Key: fileService.getYllapitoPathForProjektiFile(path, liite),
        })
      );
      const virusscan = tagResponse.TagSet?.filter((tag) => tag.Key === "viruscan").pop();
      if (virusscan) {
        if (virusscan.Value === "clean") {
          return LiitteenSkannausTulos.OK;
        } else if (virusscan.Value === "virus") {
          return LiitteenSkannausTulos.SAASTUNUT;
        }
      }
    }
  }

  // Käytetään tällä hetkellä mielipiteille: lukee GuardDuty Malware Protection for S3:n asettaman "GuardDutyMalwareScanStatus"-tagin (oma tili)
  async getGuardDutyScanResult(path: ProjektiPaths, liite: string): Promise<LiitteenSkannausTulos> {
    const key = fileService.getYllapitoPathForProjektiFile(path, liite);
    const s3 = getS3Client();
    try {
      const tulos = virusScanTagToTulos(await s3.send(new GetObjectTaggingCommand({ Bucket: config.yllapitoBucketName, Key: key })));
      if (tulos === undefined) throw new Error("Virusskannaus kesken liitteille, yritetään uudelleen");
      return tulos;
    } catch (e: unknown) {
      if (!isNoSuchKey(e)) throw e;
      log.warn("Liite poistettu ylläpitobucketista, tarkistetaan karanteenibucketista", { key });
      try {
        const tulos = virusScanTagToTulos(await s3.send(new GetObjectTaggingCommand({ Bucket: config.quarantineBucketName, Key: key })));
        if (tulos !== LiitteenSkannausTulos.SAASTUNUT) {
          throw new Error(`Liite löytyi karanteenibucketista mutta GuardDutyMalwareScanStatus-tagi puuttuu tai on odottamaton: ${key}`);
        }
        return LiitteenSkannausTulos.SAASTUNUT;
      } catch (quarantineError: unknown) {
        if (!isNoSuchKey(quarantineError)) throw quarantineError;
        throw new Error(`Liite puuttuu sekä ylläpito- että karanteenibucketista: ${key}`);
      }
    }
  }
}

export const virusScanService = new VirusScanService();

function isNoSuchKey(e: unknown): boolean {
  return e instanceof Error && e.name === "NoSuchKey";
}

function virusScanTagToTulos(tagResponse: { TagSet?: { Key?: string; Value?: string }[] }): LiitteenSkannausTulos | undefined {
  const guardDutyStatus = tagResponse.TagSet?.find((tag) => tag.Key === "GuardDutyMalwareScanStatus");
  if (!guardDutyStatus) return undefined; // Skannaus kesken, tagi ei ole vielä asetettu
  if (guardDutyStatus.Value === "NO_THREATS_FOUND") return LiitteenSkannausTulos.OK;
  if (guardDutyStatus.Value === "THREATS_FOUND") return LiitteenSkannausTulos.SAASTUNUT;
  throw new Error(`GuardDuty-skannaus epäonnistui: ${guardDutyStatus.Value}`);
}
