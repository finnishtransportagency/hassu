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

class PdfGeneratorClient {
  async generatePDF(event: GeneratePDFEvent): Promise<EnhancedPDF> {
    if (!config.pdfGeneratorLambdaArn) {
      throw new Error("config.pdfGeneratorLambdaArn määrittelemättä");
    }

    const result = await invokeLambda(config.pdfGeneratorLambdaArn, true, JSON.stringify(event));
    if (result) {
      return JSON.parse(result);
    }
    log.error(event);
    throw new Error("PDF-generointi ei onnistunut");
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
}

export const pdfGeneratorClient = new PdfGeneratorClient();
