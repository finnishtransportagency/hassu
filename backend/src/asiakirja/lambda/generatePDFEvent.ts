import {
  AloituskuulutusPdfOptions,
  CreateHyvaksymisPaatosKuulutusPdfOptions,
  CreateNahtavillaoloKuulutusPdfOptions,
  YleisotilaisuusKutsuPdfOptions,
} from "../asiakirjaTypes";

export type GeneratePDFEvent = {
  createAloituskuulutusPdf?: AloituskuulutusPdfOptions;
  createHyvaksymisPaatosKuulutusPdf?: CreateHyvaksymisPaatosKuulutusPdfOptions;
  createYleisotilaisuusKutsuPdf?: YleisotilaisuusKutsuPdfOptions;
  createNahtavillaoloKuulutusPdf?: CreateNahtavillaoloKuulutusPdfOptions;
};
