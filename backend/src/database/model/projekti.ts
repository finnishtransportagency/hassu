import { AloitusKuulutusTila, KayttajaTyyppi, Kieli, ProjektiTyyppi, Viranomainen } from "../../../../common/graphql/apiModel";
import { SuunnitteluVaihe, Vuorovaikutus } from "./suunnitteluVaihe";
import { NahtavillaoloVaihe, NahtavillaoloVaiheJulkaisu } from "./nahtavillaoloVaihe";
import { HyvaksymisPaatosVaihe, HyvaksymisPaatosVaiheJulkaisu } from "./hyvaksymisPaatosVaihe";
import { IlmoituksenVastaanottajat, LocalizedMap, StandardiYhteystiedot, Yhteystieto } from "./common";

export type DBVaylaUser = {
  email: string;
  kayttajatunnus: string;

  puhelinnumero?: string;
  organisaatio: string;
  nimi: string;
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
  ilmoituksenVastaanottajat?: IlmoituksenVastaanottajat | null;
};

export type SuunnitteluSopimus = {
  kunta: string;
  logo?: string;
  yhteysHenkilo: string;
};

export type SuunnitteluSopimusJulkaisu = {
  kunta: string,
  logo?: string | null,
  etunimi: string,
  sukunimi: string,
  puhelinnumero: string,
  email: string,
};

export type Suunnitelma = {
  asiatunnus: string;
  nimi: string;
};

export type Kielitiedot = {
  ensisijainenKieli: Kieli;
  toissijainenKieli?: Kieli;
  projektinNimiVieraskielella?: string;
};

export type KasittelynTila = {
  hyvaksymispaatos: Hyvaksymispaatos;
  ensimmainenJatkopaatos?: Hyvaksymispaatos;
  toinenJatkopaatos?: Hyvaksymispaatos;
};

export type Hyvaksymispaatos = {
  paatoksenPvm?: string;
  asianumero?: string;
};

export type Velho = {
  nimi: string;
  tyyppi?: ProjektiTyyppi | null;
  kuvaus?: string | null;
  vaylamuoto?: string[] | null;
  asiatunnusVayla?: string | null;
  asiatunnusELY?: string | null;
  suunnittelustaVastaavaViranomainen?: Viranomainen | null;
  toteuttavaOrganisaatio?: string | null;
  vastuuhenkilonNimi?: string | null;
  vastuuhenkilonEmail?: string | null;
  varahenkilonNimi?: string | null;
  varahenkilonEmail?: string | null;
  maakunnat?: string[] | null;
  kunnat?: string[] | null;
  linkki?: string | null;
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
