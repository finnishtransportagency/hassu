import { Osoite } from "./Osoite";

export type AsiakasAttributes = {
  AsiakasTunnus: string;
  TunnusTyyppi: "SSN" | "CRN";
};

/**
 * Asiakas
 * @targetNSAlias `tns`
 * @targetNamespace `http://www.suomi.fi/asiointitili`
 */
export interface Asiakas {
  /** Osoite */
  Osoite?: Osoite;
  attributes: AsiakasAttributes;
}
