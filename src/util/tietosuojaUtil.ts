// Contains code generated or recommended by Amazon Q
import { SuunnittelustaVastaavaViranomainen } from "@services/api";

export function getTietosuojaUrl(
  suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen | null | undefined,
  lang: string
): string {
  if (suunnittelustaVastaavaViranomainen == SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO) {
    return lang == "sv" ? "https://vayla.fi/sv/trafikledsverket/kontaktuppgifter/dataskyddspolicy" : "https://www.vayla.fi/tietosuoja";
  } else {
    return lang == "sv"
      ? "https://www.elinvoimakeskus.fi/sv/tietosuoja-ja-henkilotietojen-kasittely"
      : "https://www.elinvoimakeskus.fi/tietosuoja-ja-henkilotietojen-kasittely";
  }
}
