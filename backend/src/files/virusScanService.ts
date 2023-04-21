import { invokeLambda } from "../aws/lambda";
import { parameters } from "../aws/parameters";
import { log } from "../logger";
import { ProjektiPaths } from "./ProjektiPath";
import { getS3 } from "../aws/client";
import { config } from "../config";
import { fileService } from "./fileService";
import { LiitteenSkannausTulos } from "../../../common/graphql/apiModel";

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

  async getVirusScanResult(path: ProjektiPaths, liite: string | null | undefined): Promise<LiitteenSkannausTulos | undefined> {
    if (liite) {
      const s3 = getS3();
      const tagResponse = await s3
        .getObjectTagging({
          Bucket: config.yllapitoBucketName,
          Key: fileService.getYllapitoPathForProjektiFile(path, liite),
        })
        .promise();
      const virusscan = tagResponse.TagSet.filter((tag) => tag.Key == "viruscan").pop();
      if (virusscan) {
        if (virusscan.Value == "clean") {
          return LiitteenSkannausTulos.OK;
        } else if (virusscan.Value == "virus") {
          return LiitteenSkannausTulos.SAASTUNUT;
        }
      }
    }
  }
}

export const virusScanService = new VirusScanService();
