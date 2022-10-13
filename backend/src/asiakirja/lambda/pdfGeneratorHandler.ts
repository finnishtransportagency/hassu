import { log } from "../../logger";
import * as AWSXRay from "aws-xray-sdk-core";
import { setupLambdaMonitoring, setupLambdaMonitoringMetaData } from "../../aws/monitoring";
import { asiakirjaService} from "../asiakirjaService";
import { GeneratePDFEvent } from "./generatePDFEvent";
import { EnhancedPDF } from "../asiakirjaTypes";

export async function handleEvent(event: GeneratePDFEvent): Promise<EnhancedPDF> {
  setupLambdaMonitoring();

  return await AWSXRay.captureAsyncFunc("PDFGeneratorHandler", async (subsegment) => {
    setupLambdaMonitoringMetaData(subsegment);
    try {
      if (event.createAloituskuulutusPdf) {
        return await asiakirjaService.createAloituskuulutusPdf(event.createAloituskuulutusPdf);
      }
      if (event.createHyvaksymisPaatosKuulutusPdf) {
        return await asiakirjaService.createHyvaksymisPaatosKuulutusPdf(event.createHyvaksymisPaatosKuulutusPdf);
      }
      if (event.createYleisotilaisuusKutsuPdf) {
        return await asiakirjaService.createYleisotilaisuusKutsuPdf(event.createYleisotilaisuusKutsuPdf);
      }
      if (event.createNahtavillaoloKuulutusPdf) {
        return await asiakirjaService.createNahtavillaoloKuulutusPdf(event.createNahtavillaoloKuulutusPdf);
      }
    } catch (e) {
      log.error("handleEvent", e);
      throw e;
    } finally {
      if (subsegment) {
        subsegment.close();
      }
    }
    throw new Error("Unknown event:" + JSON.stringify(event));
  });
}
