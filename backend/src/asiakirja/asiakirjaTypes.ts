import { KaannettavaKieli } from "hassu-common/kaannettavatKielet";
import { AsiakirjaTyyppi, PDF, ProjektiTyyppi } from "hassu-common/graphql/apiModel";
import {
  AloitusKuulutusJulkaisu,
  DBVaylaUser,
  HyvaksymisPaatosVaiheJulkaisu,
  KasittelynTila,
  LocalizedMap,
  NahtavillaoloVaiheJulkaisu,
  Palaute,
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
  lyhytOsoite: string | undefined | null;
  velho: Velho;
  nahtavillaoloVaihe: NahtavillaoloVaiheJulkaisu;
  suunnitteluSopimus?: SuunnitteluSopimus;
  kieli: KaannettavaKieli;
  luonnos: boolean;
  asiakirjaTyyppi: NahtavillaoloKuulutusAsiakirjaTyyppi;
  kayttoOikeudet: DBVaylaUser[];
  euRahoitusLogot?: LocalizedMap<string> | null;
  vahainenMenettely?: boolean | null;
};

export type CreatePalautteetPdfOptions = {
  projektiNimi: string;
  palautteet: Palaute[];
};

export interface YleisotilaisuusKutsuPdfOptions extends CommonKutsuAdapterProps {
  suunnitteluSopimus?: SuunnitteluSopimus;
  vuorovaikutusKierrosJulkaisu: VuorovaikutusKierrosJulkaisu;
  luonnos: boolean;
}

export type AloituskuulutusPdfOptions = {
  oid: string;
  lyhytOsoite: string | undefined | null;
  aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisu;
  asiakirjaTyyppi: AsiakirjaTyyppi;
  kieli: KaannettavaKieli;
  luonnos: boolean;
  kayttoOikeudet: DBVaylaUser[];
  euRahoitusLogot?: LocalizedMap<string> | null;
  vahainenMenettely?: boolean | null;
};

export type EnhancedPDF = PDF & { textContent: string };

export type HyvaksymisPaatosKuulutusAsiakirjaTyyppi = Extract<
  AsiakirjaTyyppi,
  | AsiakirjaTyyppi.HYVAKSYMISPAATOSKUULUTUS
  | AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA
  | AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_KUNNALLE_JA_TOISELLE_VIRANOMAISELLE
  | AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_LAUSUNNONANTAJILLE
  | AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_MUISTUTTAJILLE
  | AsiakirjaTyyppi.JATKOPAATOSKUULUTUS
  | AsiakirjaTyyppi.JATKOPAATOSKUULUTUS_LAHETEKIRJE
  | AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA
  | AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA_KUNNALLE_JA_TOISELLE_VIRANOMAISELLE
  | AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA_MAAKUNTALIITOILLE
  | AsiakirjaTyyppi.JATKOPAATOSKUULUTUS2
  | AsiakirjaTyyppi.JATKOPAATOSKUULUTUS2_LAHETEKIRJE
  | AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA2
  | AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA2_KUNNALLE_JA_TOISELLE_VIRANOMAISELLE
  | AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA2_MAAKUNTALIITOILLE
>;

export type CreateHyvaksymisPaatosKuulutusPdfOptions = {
  oid: string;
  lyhytOsoite: string | undefined | null;
  hyvaksymisPaatosVaihe: HyvaksymisPaatosVaiheJulkaisu;
  kasittelynTila: KasittelynTila;
  kieli: KaannettavaKieli;
  luonnos: boolean;
  asiakirjaTyyppi: HyvaksymisPaatosKuulutusAsiakirjaTyyppi;
  kayttoOikeudet: DBVaylaUser[];
  euRahoitusLogot?: LocalizedMap<string> | null;
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
