import {
  AloitusKuulutusTila,
  IlmoituksenVastaanottajat,
  Kieli,
  ProjektiRooli,
  ProjektiTyyppi,
  Viranomainen,
} from "../../../../common/graphql/apiModel";
import { Palaute, SuunnitteluVaihe, Vuorovaikutus } from "./suunnitteluVaihe";

export type LocalizedMap<T> = { [key in Kieli]?: T } | null;

export type DBVaylaUser = {
  rooli: ProjektiRooli;
  email: string;
  kayttajatunnus: string;

  puhelinnumero: string;
  organisaatio: string;
  nimi: string;
  esitetaanKuulutuksessa?: boolean | null;
};

export type AloitusKuulutus = {
  kuulutusPaiva?: string | null;
  siirtyySuunnitteluVaiheeseen?: string | null;
  hankkeenKuvaus?: LocalizedMap<string>;
  esitettavatYhteystiedot?: Yhteystieto[] | null;
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
  suunnitteluSopimus?: SuunnitteluSopimus | null;
  kielitiedot?: Kielitiedot | null;
  aloituskuulutusPDFt?: LocalizedMap<AloitusKuulutusPDF>;
  tila?: AloitusKuulutusTila | null;
  muokkaaja?: string | null;
  hyvaksyja?: string | null;
  ilmoituksenVastaanottajat?: IlmoituksenVastaanottajat | null;
};

export type Yhteystieto = {
  etunimi: string;
  sukunimi: string;
  organisaatio: string;
  puhelinnumero: string;
  sahkoposti: string;
  titteli?: string;
};

export type SuunnitteluSopimus = {
  kunta: string;
  logo?: string;
  etunimi: string;
  sukunimi: string;
  puhelinnumero: string;
  email: string;
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

export type Velho = {
  nimi: string;
  tyyppi?: ProjektiTyyppi | null;
  kuvaus?: string | null;
  vaylamuoto?: string[] | null;
  asiatunnusVayla?: string | null;
  asiatunnusELY?: string | null;
  /**
   * @deprecated suunnittelustaVastaavaViranomainen is the correct one
   */
  tilaajaOrganisaatio?: string | null;
  suunnittelustaVastaavaViranomainen?: Viranomainen | null;
  toteuttavaOrganisaatio?: string | null;
  vastuuhenkilonNimi?: string | null;
  vastuuhenkilonEmail?: string | null;
  varahenkiloNimi?: string | null;
  varahenkiloEmail?: string | null;
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
  palautteet?: Array<Palaute> | null;
  uusiaPalautteita?: number;

  // false, jos projekti ladattiin Velhosta, mutta ei ole vielä tallennettu tietokantaan
  tallennettu?: boolean;
  kayttoOikeudet: DBVaylaUser[];
  paivitetty?: string;
};
