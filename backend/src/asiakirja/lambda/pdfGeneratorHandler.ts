import { log } from "../../logger";
import { setupLambdaMonitoring, setupLambdaMonitoringMetaData, wrapXRayAsync } from "../../aws/monitoring";
import { asiakirjaService } from "../asiakirjaService";
import { GeneratePDFEvent } from "./generatePDFEvent";
import { EnhancedPDF } from "../asiakirjaTypes";

export async function handleEvent(event: GeneratePDFEvent): Promise<EnhancedPDF> {
  setupLambdaMonitoring();

  return await wrapXRayAsync("PDFGeneratorHandler", async (subsegment) => {
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
    }
    throw new Error("Unknown event:" + JSON.stringify(event));
  });
}
