import { config } from "../../config";
import { invokeLambda } from "../../aws/lambda";
import { GeneratePDFEvent } from "./generatePDFEvent";
import { log } from "../../logger";
import {
  AloituskuulutusPdfOptions,
  CreateHyvaksymisPaatosKuulutusPdfOptions,
  CreateNahtavillaoloKuulutusPdfOptions,
  EnhancedPDF,
  YleisotilaisuusKutsuPdfOptions,
} from "../asiakirjaTypes";
import { Palaute } from "../../database/model";

class PdfGeneratorClient {
  async generatePDF(event: GeneratePDFEvent): Promise<EnhancedPDF> {
    if (!config.pdfGeneratorLambdaArn) {
      throw new Error("config.pdfGeneratorLambdaArn määrittelemättä");
    }

    const result = await invokeLambda(config.pdfGeneratorLambdaArn, true, JSON.stringify(event));
    let errorMessage = "Tuntematon virhe";
    if (result) {
      const response = JSON.parse(result);
      if (!response.errorType) {
        return response;
      } else {
        log.error("PDF-generointi ei onnistunut", { response });
        errorMessage = response.errorMessage ?? errorMessage;
      }
    }
    log.error(event);
    throw new Error("PDF-generointi ei onnistunut: " + errorMessage);
  }

  async createAloituskuulutusPdf(param: AloituskuulutusPdfOptions) {
    return this.generatePDF({ createAloituskuulutusPdf: param });
  }

  async createHyvaksymisPaatosKuulutusPdf(param: CreateHyvaksymisPaatosKuulutusPdfOptions) {
    return this.generatePDF({ createHyvaksymisPaatosKuulutusPdf: param });
  }

  async createYleisotilaisuusKutsuPdf(param: YleisotilaisuusKutsuPdfOptions) {
    return this.generatePDF({ createYleisotilaisuusKutsuPdf: param });
  }

  async createNahtavillaoloKuulutusPdf(param: CreateNahtavillaoloKuulutusPdfOptions) {
    return this.generatePDF({ createNahtavillaoloKuulutusPdf: param });
  }

  createPalautteetPDF(projektiNimi: string, palautteet: Palaute[]) {
    return this.generatePDF({ createPalautteetPDF: { projektiNimi, palautteet } });
  }
}

export const pdfGeneratorClient = new PdfGeneratorClient();
