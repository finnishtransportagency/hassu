import { ELY, Elinvoimakeskus, KayttajaTyyppi, ProjektiTyyppi, Status } from "hassu-common/graphql/apiModel";
import {
  Kielitiedot,
  LadattuTiedosto,
  LocalizedMap,
  SaameLocalizedMap,
  Velho,
  VuorovaikutusKierros,
  VuorovaikutusKierrosJulkaisu,
  NahtavillaoloVaihe,
  NahtavillaoloVaiheJulkaisu,
  HyvaksymisPaatosVaihe,
  HyvaksymisPaatosVaiheJulkaisu,
  JatkoPaatos1VaiheJulkaisu,
  JatkoPaatos2VaiheJulkaisu,
  LausuntoPyynto,
  LausuntoPyynnonTaydennys,
  AloitusKuulutus,
  AloitusKuulutusJulkaisu,
} from ".";
import { suunnitelmanTilat } from "hassu-common/generated/kasittelynTila";
import { AsianhallintaSynkronointi } from "@hassu/asianhallinta";
import { JulkaistuHyvaksymisEsitys, MuokattavaHyvaksymisEsitys } from "./hyvaksymisEsitys";
import { AineistoNew, KunnallinenLadattuTiedosto, LadattuTiedostoNew, SahkopostiVastaanottaja } from "./common";

export type DBVaylaUser = {
  email: string;
  kayttajatunnus: string;
  puhelinnumero?: string;
  organisaatio: string;
  etunimi: string;
  sukunimi: string;
  tyyppi?: KayttajaTyyppi | null;
  muokattavissa?: boolean;
  yleinenYhteystieto?: boolean;
  elyOrganisaatio?: ELY;
  evkOrganisaatio?: Elinvoimakeskus;
};

export type KuulutusSaamePDFt = SaameLocalizedMap<KuulutusSaamePDF>;

export type KuulutusSaamePDF = {
  kuulutusPDF?: LadattuTiedosto | null;
  kuulutusIlmoitusPDF?: LadattuTiedosto | null;
  kirjeTiedotettavillePDF?: LadattuTiedosto | null;
};

export type SuunnitteluSopimus = {
  kunta?: number | null;
  logo?: LocalizedMap<string> | null;
  yhteysHenkilo?: string | null;
  osapuolet?: SuunnitteluSopimusOsapuoli[] | null;
};

export type SuunnitteluSopimusJulkaisu = {
  kunta?: number | null;
  logo?: LocalizedMap<string> | null;
  etunimi?: string | null;
  sukunimi?: string | null;
  puhelinnumero?: string | null;
  email?: string | null;
  osapuolet?: SuunnitteluSopimusOsapuoli[] | null;
};

export type SuunnitteluSopimusOsapuoli = {
  osapuolenNimiFI?: string | null;
  osapuolenNimiSV?: string | null;
  osapuolenHenkilot?: OsapuolenHenkilo[] | null;
  osapuolenTyyppi?: string | null;
  osapuolenLogo?: LocalizedMap<string> | null;
};

export type OsapuolenHenkilo = {
  etunimi?: string | null;
  sukunimi?: string | null;
  puhelinnumero?: string | null;
  email?: string | null;
  yritys?: string | null;
  kunta?: string | null;
  valittu?: boolean;
};

export type Suunnitelma = {
  asiatunnus: string;
  nimi: string;
};

export type KasittelynTila = {
  suunnitelmanTila?: keyof typeof suunnitelmanTilat; // Esimerkiksi "suunnitelman-tila/sutil01"
  hyvaksymisesitysTraficomiinPaiva?: string;
  ennakkoneuvotteluPaiva?: string;
  hyvaksymispaatos?: Hyvaksymispaatos;
  ensimmainenJatkopaatos?: Hyvaksymispaatos;
  toinenJatkopaatos?: Hyvaksymispaatos;
  valitustenMaara?: number;
  lainvoimaAlkaen?: string;
  lainvoimaPaattyen?: string;
  liikenteeseenluovutusOsittain?: string;
  liikenteeseenluovutusKokonaan?: string;
  hallintoOikeus?: OikeudenPaatos;
  korkeinHallintoOikeus?: OikeudenPaatos;
  lisatieto?: string;
  ennakkotarkastus?: string;
  toimitusKaynnistynyt?: string;
  toteutusilmoitusOsittain?: string;
  toteutusilmoitusKokonaan?: string;
  suunnitelmaRauennut?: string;
  tieRatasuunnitelmaLuotu?: boolean;
  laaditunSuunnitelmanLisatiedot?: string;
};

export type OikeudenPaatos = {
  valipaatos?: Paatos;
  paatos?: Paatos;
  hyvaksymisPaatosKumottu: boolean;
};

export type Paatos = {
  paiva?: string;
  sisalto?: string;
};

export type Hyvaksymispaatos = {
  paatoksenPvm?: string | null;
  asianumero?: string;
  aktiivinen?: boolean;
};

const tallennettu: keyof DBProjekti = "tallennettu";
const nahtavillaoloVaiheJulkaisut: keyof DBProjekti = "nahtavillaoloVaiheJulkaisut";
const hyvaksymisPaatosVaiheJulkaisut: keyof DBProjekti = "hyvaksymisPaatosVaiheJulkaisut";
const jatkoPaatos1VaiheJulkaisut: keyof DBProjekti = "jatkoPaatos1VaiheJulkaisut";
const jatkoPaatos2VaiheJulkaisut: keyof DBProjekti = "jatkoPaatos2VaiheJulkaisut";
export const DBPROJEKTI_OMITTED_FIELDS = [
  tallennettu,
  nahtavillaoloVaiheJulkaisut,
  hyvaksymisPaatosVaiheJulkaisut,
  jatkoPaatos1VaiheJulkaisut,
  jatkoPaatos2VaiheJulkaisut,
] as const;
export type DBProjektiOmittedField = (typeof DBPROJEKTI_OMITTED_FIELDS)[number];

/** Data stored in a particular item in Projekti-<env> table */
export type DBProjektiSlim = Omit<DBProjekti, DBProjektiOmittedField>;

export type DBProjektiExtras = Pick<DBProjekti, DBProjektiOmittedField>;

// Data combined by joining data from multiple items from multiple tables
export type DBProjekti = {
  oid: string;
  versio: number;
  lyhytOsoite?: string | null;
  muistiinpano?: string | null;
  vaihe?: string | null;
  /**
   * @deprecated velho.tyyppi is the correct one
   */
  tyyppi?: ProjektiTyyppi | null;
  kielitiedot?: Kielitiedot | null;
  euRahoitus?: boolean | null;
  euRahoitusLogot?: LocalizedMap<string> | null;
  vahainenMenettely?: boolean | null;
  aloitusKuulutus?: AloitusKuulutus | null;
  aloitusKuulutusJulkaisut?: AloitusKuulutusJulkaisu[] | null;
  suunnitteluSopimus?: SuunnitteluSopimus | null;
  velho?: Velho | null;
  vuorovaikutusKierros?: VuorovaikutusKierros | null;
  vuorovaikutusKierrosJulkaisut?: VuorovaikutusKierrosJulkaisu[] | null;
  muokattavaHyvaksymisEsitys?: MuokattavaHyvaksymisEsitys | null;
  julkaistuHyvaksymisEsitys?: JulkaistuHyvaksymisEsitys | null;
  nahtavillaoloVaihe?: NahtavillaoloVaihe | null;
  nahtavillaoloVaiheJulkaisut?: NahtavillaoloVaiheJulkaisu[] | null;
  lausuntoPyynnot?: LausuntoPyynto[] | null;
  lausuntoPyynnonTaydennykset?: LausuntoPyynnonTaydennys[] | null;
  hyvaksymisPaatosVaihe?: HyvaksymisPaatosVaihe | null;
  hyvaksymisPaatosVaiheJulkaisut?: HyvaksymisPaatosVaiheJulkaisu[] | null;
  jatkoPaatos1Vaihe?: HyvaksymisPaatosVaihe | null;
  jatkoPaatos1VaiheJulkaisut?: JatkoPaatos1VaiheJulkaisu[] | null;
  jatkoPaatos2Vaihe?: HyvaksymisPaatosVaihe | null;
  jatkoPaatos2VaiheJulkaisut?: JatkoPaatos2VaiheJulkaisu[] | null;
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

  // false, jos projekti ladattiin Velhosta, mutta ei ole vielä tallennettu tietokantaan
  tallennettu?: boolean;
};

export type ProjektinJakautuminen = {
  jaettuProjekteihin?: string[];
  jaettuProjektista?: string;
};

export type DBEnnakkoNeuvottelu = {
  poistumisPaiva?: string | null;
  lisatiedot?: string | null;
  hyvaksymisEsitys?: Array<LadattuTiedostoNew> | null;
  suunnitelma?: Array<AineistoNew> | null;
  muistutukset?: Array<KunnallinenLadattuTiedosto> | null;
  lausunnot?: Array<LadattuTiedostoNew> | null;
  kuulutuksetJaKutsu?: Array<LadattuTiedostoNew> | null;
  muuAineistoVelhosta?: Array<AineistoNew> | null;
  muuAineistoKoneelta?: Array<LadattuTiedostoNew> | null;
  linkitetynProjektinAineisto?: Array<AineistoNew> | null;
  maanomistajaluettelo?: Array<LadattuTiedostoNew> | null;
  vastaanottajat?: Array<SahkopostiVastaanottaja> | null;
  muokkaaja?: string | null;
  poisValitutKuulutuksetJaKutsu?: string[];
  poisValitutMaanomistajaluettelot?: string[];
};

export type DBEnnakkoNeuvotteluJulkaisu = DBEnnakkoNeuvottelu & { lahetetty: string; poistumisPaiva: string };

export type OmistajaHaku = {
  virhe?: boolean | null;
  kaynnistetty?: string | null;
  kiinteistotunnusMaara?: number | null;
  status?: Status | null;
};

export type Asianhallinta = {
  inaktiivinen?: boolean;
  asiaId?: number;
};

export type SaveDBProjektiInput = Partial<DBProjekti> & Pick<DBProjekti, "oid" | "versio">;
export type SaveDBProjektiWithoutLockingInput = Partial<DBProjekti> & Pick<DBProjekti, "oid">;
export type SaveDBProjektiSlimInput = Partial<DBProjektiSlim> & Pick<DBProjektiSlim, "oid" | "versio">;
export type SaveDBProjektiSlimWithoutLockingInput = Partial<DBProjektiSlim> & Pick<DBProjektiSlim, "oid">;
