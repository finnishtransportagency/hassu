import {
  IlmoituksenVastaanottajat,
  KaytettavaPalvelu,
  VuorovaikutusTilaisuusTyyppi,
  Yhteystieto,
} from "../../../../common/graphql/apiModel";
import { LocalizedMap } from "./projekti";

export type SuunnitteluVaihe = {
  hankkeenKuvaus?: LocalizedMap<string>;
  arvioSeuraavanVaiheenAlkamisesta?: string | null;
};

export type Vuorovaikutus = {
  // Vuorovaikutuksen jarjestysnumero
  vuorovaikutusNumero: number;
  vuorovaikutusTilaisuudet?: Array<VuorovaikutusTilaisuus> | null;
  // yyyy-MM-dd tai testattaessa yyyy-MM-ddTHH:mm
  vuorovaikutusJulkaisuPaiva?: string | null;
  // yyyy-MM-dd tai testattaessa yyyy-MM-ddTHH:mm
  kysymyksetJaPalautteetViimeistaan?: string | null;
  // yyyy-MM-dd tai testattaessa yyyy-MM-ddTHH:mm
  aineistoPoistetaanNakyvista?: string | null;
  videot?: Array<Linkki> | null;
  esitettavatYhteystiedot?: Array<Yhteystieto | null> | null;
  // Lista kayttajatunnuksia
  vuorovaikutusYhteysHenkilot?: Array<string> | null;
  ilmoituksenVastaanottajat?: IlmoituksenVastaanottajat | null;
  aineistot?: Aineisto[] | null;
};

export type Aineisto = {
  kategoria?: string | null;
  // Dokumentin oid Velhossa
  dokumenttiOid?: string | null;
  // Suhteellinen polku tiedostoon yllapidon S3-bucketissa projektin alla
  tiedosto: string;
  // Aikaleima, milloin tiedosto on tuotu jarjestelmaan yyyy-MM-ddTHH:mm
  tuotu: string;
  // Numero jarjestamista varten
  jarjestys?: number | null;
};

export type VuorovaikutusTilaisuus = {
  tyyppi: VuorovaikutusTilaisuusTyyppi;
  nimi: string;
  // yyyy-MM-dd
  paivamaara: string;
  // HH:mm
  alkamisAika: string;
  // HH:mm
  paattymisAika: string;
  kaytettavaPalvelu?: KaytettavaPalvelu | null;
  linkki?: string | null;
  paikka?: string | null;
  osoite?: string | null;
  postinumero?: string | null;
  postitoimipaikka?: string | null;
  Saapumisohjeet?: string | null;
};

export type Linkki = {
  nimi: string;
  url: string;
};
