import { TilaKoodi } from "./TilaKoodi";
import { Asiakkaat1 } from "./Asiakkaat1";

/**
 * HaeAsiakkaitaResult
 * @targetNSAlias `tns`
 * @targetNamespace `http://www.suomi.fi/asiointitili`
 */
export interface HaeAsiakkaitaResult {
  /** TilaKoodi */
  TilaKoodi?: TilaKoodi;
  /** Asiakkaat */
  Asiakkaat?: Asiakkaat1;
}
