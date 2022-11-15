import { AloitusKuulutusTila, KayttajaTyyppi, ProjektiTyyppi, Viranomainen } from "../../../../common/graphql/apiModel";
import { SuunnitteluVaihe, Vuorovaikutus } from "./suunnitteluVaihe";
import { NahtavillaoloVaihe, NahtavillaoloVaiheJulkaisu } from "./nahtavillaoloVaihe";
import { HyvaksymisPaatosVaihe, HyvaksymisPaatosVaiheJulkaisu } from "./hyvaksymisPaatosVaihe";
import {
  IlmoituksenVastaanottajat,
  Kielitiedot,
  LocalizedMap,
  StandardiYhteystiedot,
  UudelleenKuulutus,
  Velho,
  Yhteystieto,
} from "./common";
import { suunnitelmanTilat } from "../../../../common/generated/kasittelynTila";

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
};

export type AloitusKuulutus = {
  kuulutusPaiva?: string | null;
  siirtyySuunnitteluVaiheeseen?: string | null;
  hankkeenKuvaus?: LocalizedMap<string>;
  kuulutusYhteystiedot?: StandardiYhteystiedot;
  ilmoituksenVastaanottajat?: IlmoituksenVastaanottajat | null;
  palautusSyy?: string | null;
  uudelleenKuulutus?: UudelleenKuulutus | null;
};

export type AloitusKuulutusPDF = {
  aloituskuulutusPDFPath: string;
  aloituskuulutusIlmoitusPDFPath: string;
};

export type AloitusKuulutusJulkaisu = {
  id: number;
  kuulutusPaiva?: string | null;
  siirtyySuunnitteluVaiheeseen?: string | null;
  hankkeenKuvaus?: LocalizedMap<string>;
  elyKeskus?: string | null;
  yhteystiedot: Yhteystieto[];
  velho: Velho;
  suunnitteluSopimus?: SuunnitteluSopimusJulkaisu | null;
  kielitiedot?: Kielitiedot | null;
  aloituskuulutusPDFt?: LocalizedMap<AloitusKuulutusPDF>;
  tila?: AloitusKuulutusTila | null;
  muokkaaja?: string | null;
  hyvaksyja?: string | null;
  hyvaksymisPaiva?: string | null;
  ilmoituksenVastaanottajat?: IlmoituksenVastaanottajat | null;
  uudelleenKuulutus?: UudelleenKuulutus | null;
};

export type SuunnitteluSopimus = {
  kunta: number;
  logo?: string;
  yhteysHenkilo: string;
};

export type SuunnitteluSopimusJulkaisu = {
  kunta: number;
  logo?: string | null;
  etunimi: string;
  sukunimi: string;
  puhelinnumero: string;
  email: string;
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
};

export type Hyvaksymispaatos = {
  paatoksenPvm?: string;
  asianumero?: string;
  aktiivinen?: boolean;
};

export type DBProjekti = {
  oid: string;
  muistiinpano?: string | null;
  vaihe?: string | null;
  /**
   * @deprecated velho.tyyppi is the correct one
   */
  tyyppi?: ProjektiTyyppi | null;
  /**
   * @deprecated velho.suunnittelustaVastaavaViranomainen is the correct one
   */
  suunnittelustaVastaavaViranomainen?: Viranomainen | null;
  kielitiedot?: Kielitiedot | null;
  euRahoitus?: boolean | null;
  aloitusKuulutus?: AloitusKuulutus | null;
  aloitusKuulutusJulkaisut?: AloitusKuulutusJulkaisu[] | null;
  suunnitteluSopimus?: SuunnitteluSopimus | null;
  velho?: Velho | null;
  liittyvatSuunnitelmat?: Suunnitelma[] | null;
  suunnitteluVaihe?: SuunnitteluVaihe | null;
  vuorovaikutukset?: Array<Vuorovaikutus> | null;
  nahtavillaoloVaihe?: NahtavillaoloVaihe | null;
  nahtavillaoloVaiheJulkaisut?: NahtavillaoloVaiheJulkaisu[] | null;
  hyvaksymisPaatosVaihe?: HyvaksymisPaatosVaihe | null;
  hyvaksymisPaatosVaiheJulkaisut?: HyvaksymisPaatosVaiheJulkaisu[] | null;
  jatkoPaatos1Vaihe?: HyvaksymisPaatosVaihe | null;
  jatkoPaatos1VaiheJulkaisut?: HyvaksymisPaatosVaiheJulkaisu[] | null;
  jatkoPaatos2Vaihe?: HyvaksymisPaatosVaihe | null;
  jatkoPaatos2VaiheJulkaisut?: HyvaksymisPaatosVaiheJulkaisu[] | null;
  uusiaPalautteita?: number;

  // false, jos projekti ladattiin Velhosta, mutta ei ole vielä tallennettu tietokantaan
  tallennettu?: boolean;
  kayttoOikeudet: DBVaylaUser[];
  paivitetty?: string;
  ajastettuTarkistus?: string;
  // Secret salt to use when generating lisaaineisto links within this projekti
  salt?: string;
  kasittelynTila?: KasittelynTila | null;
};
