import {
  IlmoituksenVastaanottajat,
  KaytettavaPalvelu,
  VuorovaikutusTilaisuusTyyppi,
} from "../../../../common/graphql/apiModel";
import { Aineisto, LocalizedMap, Yhteystieto } from "./common";

export type SuunnitteluVaihe = {
  hankkeenKuvaus?: LocalizedMap<string>;
  arvioSeuraavanVaiheenAlkamisesta?: string | null;
  suunnittelunEteneminenJaKesto?: string | null;
  julkinen?: boolean | null;
  // Palautteiden vastaanottajat. Lista kayttajatunnuksia
  palautteidenVastaanottajat?: Array<string> | null;
};

export type Vuorovaikutus = {
  // Vuorovaikutuksen jarjestysnumero
  vuorovaikutusNumero: number;
  julkinen?: boolean | null;
  vuorovaikutusTilaisuudet?: Array<VuorovaikutusTilaisuus> | null;
  // yyyy-MM-dd tai testattaessa yyyy-MM-ddTHH:mm
  vuorovaikutusJulkaisuPaiva?: string | null;
  // yyyy-MM-dd tai testattaessa yyyy-MM-ddTHH:mm
  kysymyksetJaPalautteetViimeistaan?: string | null;
  videot?: Array<Linkki> | null;
  suunnittelumateriaali?: Linkki | null;
  esitettavatYhteystiedot?: Array<Yhteystieto | null> | null;
  // Lista kayttajatunnuksia
  vuorovaikutusYhteysHenkilot?: Array<string> | null;
  ilmoituksenVastaanottajat?: IlmoituksenVastaanottajat | null;
  esittelyaineistot?: Aineisto[] | null;
  suunnitelmaluonnokset?: Aineisto[] | null;
  vuorovaikutusPDFt?: LocalizedMap<VuorovaikutusPDF>;
};

export type VuorovaikutusPDF = {
  kutsuPDFPath: string;
};

export type VuorovaikutusTilaisuus = {
  tyyppi: VuorovaikutusTilaisuusTyyppi;
  nimi?: string;
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
  projektiYhteysHenkilot?: Array<string> | null;
  esitettavatYhteystiedot?: Array<Yhteystieto | null> | null;
};

export type NimiJaPuhelinnumero = {
  nimi: string;
  puhelinnumero: string;
};

export type Linkki = {
  nimi: string;
  url: string;
};

export type Palaute = {
  id: string;
  vastaanotettu: string;
  etunimi?: string | null;
  sukunimi?: string | null;
  sahkoposti?: string | null;
  puhelinnumero?: string | null;
  kysymysTaiPalaute?: string | null;
  yhteydenottotapaEmail?: boolean | null;
  yhteydenottotapaPuhelin?: boolean | null;
  liite?: string | null;
  otettuKasittelyyn?: boolean | null;
};
