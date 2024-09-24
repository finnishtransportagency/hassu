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

  async getVirusScanResult(path: ProjektiPaths, liitteet: string[] | null | undefined): Promise<LiitteenSkannausTulos | undefined> {
    if (liitteet && liitteet.length > 0) {
      const s3 = getS3Client();
      let result = true;
      for (const liite of liitteet) {
        const tagResponse = await s3.send(
          new GetObjectTaggingCommand({
            Bucket: config.yllapitoBucketName,
            Key: fileService.getYllapitoPathForProjektiFile(path, liite),
          })
        );
        const virusscan = tagResponse.TagSet?.filter((tag) => tag.Key == "viruscan").pop();
        if (virusscan) {
          result = result && virusscan.Value === "clean";
        } else {
          return undefined;
        }
        if (!result) {
          break;
        }
      }
      return result ? LiitteenSkannausTulos.OK : LiitteenSkannausTulos.SAASTUNUT;
    }
  }
}

export const virusScanService = new VirusScanService();
