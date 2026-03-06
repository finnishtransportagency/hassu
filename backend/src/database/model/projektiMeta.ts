import {
  Kielitiedot,
  LocalizedMap,
  Velho,
  VuorovaikutusKierros,
  VuorovaikutusKierrosJulkaisu,
  NahtavillaoloVaihe,
  HyvaksymisPaatosVaihe,
  LausuntoPyynto,
  LausuntoPyynnonTaydennys,
  AloitusKuulutus,
  SuunnitteluSopimus,
  DBVaylaUser,
  KasittelynTila,
  Asianhallinta,
  OmistajaHaku,
  DBEnnakkoNeuvottelu,
  DBEnnakkoNeuvotteluJulkaisu,
  ProjektinJakautuminen,
} from ".";
import { AsianhallintaSynkronointi } from "@hassu/asianhallinta";
import { JulkaistuHyvaksymisEsitys, MuokattavaHyvaksymisEsitys } from "./hyvaksymisEsitys";

// Data combined by joining data from multiple items from multiple tables

export interface ProjektiMeta {
  oid: string;
  versio: number;
  lyhytOsoite?: string | null;
  muistiinpano?: string | null;
  vaihe?: string | null;
  kielitiedot?: Kielitiedot | null;
  euRahoitus?: boolean | null;
  euRahoitusLogot?: LocalizedMap<string> | null;
  vahainenMenettely?: boolean | null;
  aloitusKuulutus?: AloitusKuulutus | null;
  suunnitteluSopimus?: SuunnitteluSopimus | null;
  velho?: Velho | null;
  vuorovaikutusKierros?: VuorovaikutusKierros | null;
  vuorovaikutusKierrosJulkaisut?: VuorovaikutusKierrosJulkaisu[] | null;
  muokattavaHyvaksymisEsitys?: MuokattavaHyvaksymisEsitys | null;
  julkaistuHyvaksymisEsitys?: JulkaistuHyvaksymisEsitys | null;
  nahtavillaoloVaihe?: NahtavillaoloVaihe | null;
  lausuntoPyynnot?: LausuntoPyynto[] | null;
  lausuntoPyynnonTaydennykset?: LausuntoPyynnonTaydennys[] | null;
  hyvaksymisPaatosVaihe?: HyvaksymisPaatosVaihe | null;
  jatkoPaatos1Vaihe?: HyvaksymisPaatosVaihe | null;
  jatkoPaatos2Vaihe?: HyvaksymisPaatosVaihe | null;
  uusiaPalautteita?: number;

  kayttoOikeudet: DBVaylaUser[];
  paivitetty?: string;
  // Secret salt to use when generating lisaaineisto links within this projekti
  salt?: string;
  kasittelynTila?: KasittelynTila | null;
  // Map asianhallintaEventId -> AsianhallintaSynkronointi
  synkronoinnit?: Record<string, AsianhallintaSynkronointi>;
  annetutMuistutukset?: string[];
  asianhallinta?: Asianhallinta;
  muistuttajat?: string[];
  muutMuistuttajat?: string[];
  omistajahaku?: OmistajaHaku | null;
  kustannuspaikka?: string | null;
  lockedUntil?: number | null;
  aineistoHandledAt?: string | null;
  hyvEsAineistoPaketti?: string | null;
  ennakkoNeuvottelu?: DBEnnakkoNeuvottelu;
  ennakkoNeuvotteluJulkaisu?: DBEnnakkoNeuvotteluJulkaisu;
  ennakkoNeuvotteluAineistoPaketti?: string | null;
  projektinJakautuminen?: ProjektinJakautuminen;
}
