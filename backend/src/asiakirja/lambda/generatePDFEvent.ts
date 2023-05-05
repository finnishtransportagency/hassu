import {
  AloituskuulutusPdfOptions,
  CreateHyvaksymisPaatosKuulutusPdfOptions,
  CreateNahtavillaoloKuulutusPdfOptions,
  CreatePalautteetPdfOptions,
  YleisotilaisuusKutsuPdfOptions,
} from "../asiakirjaTypes";

export type GeneratePDFEvent = {
  createAloituskuulutusPdf?: AloituskuulutusPdfOptions;
  createHyvaksymisPaatosKuulutusPdf?: CreateHyvaksymisPaatosKuulutusPdfOptions;
  createYleisotilaisuusKutsuPdf?: YleisotilaisuusKutsuPdfOptions;
  createNahtavillaoloKuulutusPdf?: CreateNahtavillaoloKuulutusPdfOptions;
  createPalautteetPDF?: CreatePalautteetPdfOptions;
};
