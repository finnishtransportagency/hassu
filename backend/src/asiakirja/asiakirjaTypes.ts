import { AsiakirjaTyyppi, Kieli, PDF, ProjektiTyyppi } from "../../../common/graphql/apiModel";
import {
  AloitusKuulutusJulkaisu,
  DBVaylaUser,
  EuRahoitusLogot,
  HyvaksymisPaatosVaiheJulkaisu,
  KasittelynTila,
  NahtavillaoloVaiheJulkaisu,
  SuunnitteluSopimus,
  Velho,
  VuorovaikutusKierrosJulkaisu,
} from "../database/model";
import { CommonKutsuAdapterProps } from "./adapter/commonKutsuAdapter";

export enum AsiakirjanMuoto {
  TIE = "TIE",
  RATA = "RATA",
}

export type NahtavillaoloKuulutusAsiakirjaTyyppi = Extract<
  AsiakirjaTyyppi,
  | AsiakirjaTyyppi.NAHTAVILLAOLOKUULUTUS
  | AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KIINTEISTOJEN_OMISTAJILLE
  | AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KUNNILLE_VIRANOMAISELLE
>;

export type CreateNahtavillaoloKuulutusPdfOptions = {
  oid: string;
  velho: Velho;
  nahtavillaoloVaihe: NahtavillaoloVaiheJulkaisu;
  suunnitteluSopimus?: SuunnitteluSopimus;
  kieli: Kieli;
  luonnos: boolean;
  asiakirjaTyyppi: NahtavillaoloKuulutusAsiakirjaTyyppi;
  kayttoOikeudet: DBVaylaUser[];
  euRahoitusLogot?: EuRahoitusLogot | null;
};

export interface YleisotilaisuusKutsuPdfOptions extends CommonKutsuAdapterProps {
  suunnitteluSopimus?: SuunnitteluSopimus;
  vuorovaikutusKierrosJulkaisu: VuorovaikutusKierrosJulkaisu;
  luonnos: boolean;
}

export type AloituskuulutusPdfOptions = {
  oid: string;
  aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisu;
  asiakirjaTyyppi: AsiakirjaTyyppi;
  kieli: Kieli;
  luonnos: boolean;
  kayttoOikeudet: DBVaylaUser[];
  euRahoitusLogot?: EuRahoitusLogot | null;
};

export type EnhancedPDF = PDF & { textContent: string };

export type HyvaksymisPaatosKuulutusAsiakirjaTyyppi = Extract<
  AsiakirjaTyyppi,
  | AsiakirjaTyyppi.HYVAKSYMISPAATOSKUULUTUS
  | AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA
  | AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_KUNNALLE_JA_TOISELLE_VIRANOMAISELLE
  | AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_LAUSUNNONANTAJILLE
  | AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_MUISTUTTAJILLE
>;

export type CreateHyvaksymisPaatosKuulutusPdfOptions = {
  oid: string;
  hyvaksymisPaatosVaihe: HyvaksymisPaatosVaiheJulkaisu;
  kasittelynTila: KasittelynTila;
  kieli: Kieli;
  luonnos: boolean;
  asiakirjaTyyppi: HyvaksymisPaatosKuulutusAsiakirjaTyyppi;
  kayttoOikeudet: DBVaylaUser[];
  euRahoitusLogot?: EuRahoitusLogot | null;
};

export function determineAsiakirjaMuoto(
  tyyppi: ProjektiTyyppi | undefined | null,
  vaylamuoto: string[] | undefined | null
): AsiakirjanMuoto {
  if (tyyppi === ProjektiTyyppi.TIE || (tyyppi === ProjektiTyyppi.YLEINEN && vaylamuoto?.includes("tie"))) {
    return AsiakirjanMuoto.TIE;
  } else if (tyyppi === ProjektiTyyppi.RATA || (tyyppi === ProjektiTyyppi.YLEINEN && vaylamuoto?.includes("rata"))) {
    return AsiakirjanMuoto.RATA;
  }
  throw new Error("Asiakirjan muotoa ei voitu päätellä");
}
