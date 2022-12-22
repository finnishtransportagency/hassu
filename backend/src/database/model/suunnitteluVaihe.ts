import { KaytettavaPalvelu, VuorovaikutusKierrosTila, VuorovaikutusTilaisuusTyyppi } from "../../../../common/graphql/apiModel";
import { Aineisto, LocalizedMap, StandardiYhteystiedot, IlmoituksenVastaanottajat, Yhteystieto } from "./common";

export type VuorovaikutusKierros = {
  // Viimeisimmän vuorovaikutuksen jarjestysnumero
  vuorovaikutusNumero: number;
  hankkeenKuvaus?: LocalizedMap<string>;
  arvioSeuraavanVaiheenAlkamisesta?: string | null;
  suunnittelunEteneminenJaKesto?: string | null;
  tila?: VuorovaikutusKierrosTila | null;
  // Palautteiden vastaanottajat. Lista kayttajatunnuksia
  palautteidenVastaanottajat?: Array<string> | null;
  vuorovaikutusTilaisuudet?: Array<VuorovaikutusTilaisuus> | null;
  // yyyy-MM-dd tai testattaessa yyyy-MM-ddTHH:mm
  vuorovaikutusJulkaisuPaiva?: string | null;
  // yyyy-MM-dd tai testattaessa yyyy-MM-ddTHH:mm
  kysymyksetJaPalautteetViimeistaan?: string | null;
  videot?: Array<Linkki> | null;
  suunnittelumateriaali?: Linkki | null;
  esitettavatYhteystiedot?: StandardiYhteystiedot;
  ilmoituksenVastaanottajat?: IlmoituksenVastaanottajat | null;
  esittelyaineistot?: Aineisto[] | null;
  suunnitelmaluonnokset?: Aineisto[] | null;
};

export type VuorovaikutusKierrosJulkaisu = {
  // Vuorovaikutuksen jarjestysnumero
  id: number;
  hankkeenKuvaus?: LocalizedMap<string>;
  arvioSeuraavanVaiheenAlkamisesta?: string | null;
  suunnittelunEteneminenJaKesto?: string | null;
  tila?: VuorovaikutusKierrosTila | null;
  // Palautteiden vastaanottajat. Lista kayttajatunnuksia
  palautteidenVastaanottajat?: Array<string> | null;
  vuorovaikutusTilaisuudet?: Array<VuorovaikutusTilaisuusJulkaisu> | null;
  // yyyy-MM-dd tai testattaessa yyyy-MM-ddTHH:mm
  vuorovaikutusJulkaisuPaiva?: string | null;
  // yyyy-MM-dd tai testattaessa yyyy-MM-ddTHH:mm
  kysymyksetJaPalautteetViimeistaan?: string | null;
  videot?: Array<Linkki> | null;
  suunnittelumateriaali?: Linkki | null;
  yhteystiedot?: Yhteystieto[];
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
  esitettavatYhteystiedot?: StandardiYhteystiedot;
};

export type VuorovaikutusTilaisuusJulkaisu = {
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
  yhteystiedot?: Yhteystieto[];
};

export type Linkki = {
  nimi: string;
  url: string;
};
