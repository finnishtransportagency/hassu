import { AsiakirjaTyyppi, Kieli, PDF, ProjektiTyyppi } from "../../../common/graphql/apiModel";
import {
  AloitusKuulutusJulkaisu,
  DBVaylaUser,
  HyvaksymisPaatosVaiheJulkaisu,
  KasittelynTila,
  Kielitiedot,
  NahtavillaoloVaiheJulkaisu,
  SuunnitteluSopimus,
  Velho,
  VuorovaikutusKierrosJulkaisu,
} from "../database/model";

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
  velho: Velho;
  nahtavillaoloVaihe: NahtavillaoloVaiheJulkaisu;
  suunnitteluSopimus?: SuunnitteluSopimus;
  kieli: Kieli;
  luonnos: boolean;
  asiakirjaTyyppi: NahtavillaoloKuulutusAsiakirjaTyyppi;
  kayttoOikeudet: DBVaylaUser[];
};

export type YleisotilaisuusKutsuPdfOptions = {
  oid: string;
  velho: Velho;
  kielitiedot: Kielitiedot;
  suunnitteluSopimus?: SuunnitteluSopimus;
  vuorovaikutusKierrosJulkaisu: VuorovaikutusKierrosJulkaisu;
  kieli: Kieli;
  asiakirjanMuoto: AsiakirjanMuoto;
  luonnos: boolean;
  kayttoOikeudet: DBVaylaUser[];
};

export type AloituskuulutusPdfOptions = {
  aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisu;
  asiakirjaTyyppi: AsiakirjaTyyppi;
  kieli: Kieli;
  luonnos: boolean;
  kayttoOikeudet: DBVaylaUser[];
};

export type EnhancedPDF = PDF & { textContent: string };

export type HyvaksymisPaatosKuulutusAsiakirjaTyyppi = Extract<
  AsiakirjaTyyppi,
  | AsiakirjaTyyppi.HYVAKSYMISPAATOSKUULUTUS
  | AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_KUNNILLE
  | AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_TOISELLE_VIRANOMAISELLE
  | AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_LAUSUNNONANTAJILLE
  | AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_MUISTUTTAJILLE
>;

export type CreateHyvaksymisPaatosKuulutusPdfOptions = {
  oid: string;
  hyvaksymisPaatosVaihe: HyvaksymisPaatosVaiheJulkaisu;
  suunnitteluSopimus?: SuunnitteluSopimus;
  kasittelynTila: KasittelynTila;
  kieli: Kieli;
  luonnos: boolean;
  asiakirjaTyyppi: HyvaksymisPaatosKuulutusAsiakirjaTyyppi;
  kayttoOikeudet: DBVaylaUser[];
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
