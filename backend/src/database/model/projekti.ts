import { AsianhallintaSynkronointi } from "@hassu/asianhallinta";
import {
  NahtavillaoloVaiheJulkaisu,
  HyvaksymisPaatosVaiheJulkaisu,
  JatkoPaatos1VaiheJulkaisu,
  JatkoPaatos2VaiheJulkaisu,
  AloitusKuulutusJulkaisu,
  Kielitiedot,
  LocalizedMap,
  AloitusKuulutus,
  SuunnitteluSopimus,
  Velho,
  VuorovaikutusKierros,
  VuorovaikutusKierrosJulkaisu,
  MuokattavaHyvaksymisEsitys,
  JulkaistuHyvaksymisEsitys,
  NahtavillaoloVaihe,
  LausuntoPyynto,
  HyvaksymisPaatosVaihe,
  LausuntoPyynnonTaydennys,
  DBVaylaUser,
  KasittelynTila,
  Asianhallinta,
  OmistajaHaku,
  DBEnnakkoNeuvottelu,
  DBEnnakkoNeuvotteluJulkaisu,
  ProjektinJakautuminen,
} from ".";

const tallennettu: keyof DBProjekti = "tallennettu";
const aloitusKuulutusJulkaisut: keyof DBProjekti = "aloitusKuulutusJulkaisut";
const nahtavillaoloVaiheJulkaisut: keyof DBProjekti = "nahtavillaoloVaiheJulkaisut";
const hyvaksymisPaatosVaiheJulkaisut: keyof DBProjekti = "hyvaksymisPaatosVaiheJulkaisut";
const jatkoPaatos1VaiheJulkaisut: keyof DBProjekti = "jatkoPaatos1VaiheJulkaisut";
const jatkoPaatos2VaiheJulkaisut: keyof DBProjekti = "jatkoPaatos2VaiheJulkaisut";
export const DBPROJEKTI_OMITTED_FIELDS = [
  tallennettu,
  aloitusKuulutusJulkaisut,
  nahtavillaoloVaiheJulkaisut,
  hyvaksymisPaatosVaiheJulkaisut,
  jatkoPaatos1VaiheJulkaisut,
  jatkoPaatos2VaiheJulkaisut,
] as const;
export type DBProjektiOmittedField = (typeof DBPROJEKTI_OMITTED_FIELDS)[number];

/** Data stored in a particular item in Projekti-<env> table */
export type DBProjektiSlim = {
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
};

export type DBProjektiExtras = {
  aloitusKuulutusJulkaisut?: AloitusKuulutusJulkaisu[] | null;
  nahtavillaoloVaiheJulkaisut?: NahtavillaoloVaiheJulkaisu[] | null;
  hyvaksymisPaatosVaiheJulkaisut?: HyvaksymisPaatosVaiheJulkaisu[] | null;
  jatkoPaatos1VaiheJulkaisut?: JatkoPaatos1VaiheJulkaisu[] | null;
  jatkoPaatos2VaiheJulkaisut?: JatkoPaatos2VaiheJulkaisu[] | null;
  tallennettu?: boolean;
};

// Data combined by joining data from multiple items from multiple tables
export type DBProjekti = DBProjektiSlim & DBProjektiExtras;

export type SaveDBProjektiInput = Partial<DBProjekti> & Pick<DBProjekti, "oid" | "versio">;
export type SaveDBProjektiWithoutLockingInput = Partial<DBProjekti> & Pick<DBProjekti, "oid">;
export type SaveDBProjektiSlimInput = Partial<DBProjektiSlim> & Pick<DBProjektiSlim, "oid" | "versio">;
export type SaveDBProjektiSlimWithoutLockingInput = Partial<DBProjektiSlim> & Pick<DBProjektiSlim, "oid">;
