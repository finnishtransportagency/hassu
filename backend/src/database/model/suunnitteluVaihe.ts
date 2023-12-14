import { KaytettavaPalvelu, VuorovaikutusKierrosTila, VuorovaikutusTilaisuusTyyppi } from "hassu-common/graphql/apiModel";
import {
  Aineisto,
  IlmoituksenVastaanottajat,
  LadattuTiedosto,
  LocalizedMap,
  RequiredLocalizedMap,
  StandardiYhteystiedot,
  Yhteystieto,
} from "./common";

export type VuorovaikutusKierros = {
  // Viimeisimmän vuorovaikutuksen jarjestysnumero
  vuorovaikutusNumero: number;
  hankkeenKuvaus?: LocalizedMap<string>;
  arvioSeuraavanVaiheenAlkamisesta?: LocalizedMap<string> | null;
  suunnittelunEteneminenJaKesto?: LocalizedMap<string> | null;
  tila?: VuorovaikutusKierrosTila | null;
  // Palautteiden vastaanottajat. Lista kayttajatunnuksia
  palautteidenVastaanottajat?: Array<string> | null;
  vuorovaikutusTilaisuudet?: Array<VuorovaikutusTilaisuus> | null;
  // yyyy-MM-dd tai testattaessa yyyy-MM-ddTHH:mm
  vuorovaikutusJulkaisuPaiva?: string | null;
  // yyyy-MM-dd tai testattaessa yyyy-MM-ddTHH:mm
  kysymyksetJaPalautteetViimeistaan?: string | null;
  videot?: Array<RequiredLocalizedMap<Linkki>> | null;
  suunnittelumateriaali?: RequiredLocalizedMap<Linkki>[] | null;
  esitettavatYhteystiedot?: StandardiYhteystiedot;
  ilmoituksenVastaanottajat?: IlmoituksenVastaanottajat | null;
  aineistot?: Aineisto[] | null;
  vuorovaikutusSaamePDFt?: VuorovaikutusKutsuSaamePDFt | null;
  selosteVuorovaikutuskierrokselle?: string | null;
  palattuNahtavillaolosta?: boolean;
};

export type VuorovaikutusKierrosJulkaisu = {
  // Vuorovaikutuksen jarjestysnumero
  id: number;
  hankkeenKuvaus?: LocalizedMap<string>;
  arvioSeuraavanVaiheenAlkamisesta?: LocalizedMap<string> | null;
  suunnittelunEteneminenJaKesto?: LocalizedMap<string> | null;
  tila?: VuorovaikutusKierrosTila | null;
  // Palautteiden vastaanottajat. Lista kayttajatunnuksia
  palautteidenVastaanottajat?: Array<string> | null;
  vuorovaikutusTilaisuudet?: Array<VuorovaikutusTilaisuusJulkaisu> | null;
  // yyyy-MM-dd tai testattaessa yyyy-MM-ddTHH:mm
  vuorovaikutusJulkaisuPaiva?: string | null;
  // yyyy-MM-dd tai testattaessa yyyy-MM-ddTHH:mm
  kysymyksetJaPalautteetViimeistaan?: string | null;
  videot?: Array<RequiredLocalizedMap<Linkki>> | null;
  suunnittelumateriaali?: RequiredLocalizedMap<Linkki>[] | null;
  yhteystiedot: Yhteystieto[];
  esitettavatYhteystiedot: StandardiYhteystiedot;
  ilmoituksenVastaanottajat?: IlmoituksenVastaanottajat | null;
  aineistot?: Aineisto[] | null;
  vuorovaikutusPDFt?: LocalizedMap<VuorovaikutusPDF>;
  vuorovaikutusSaamePDFt?: VuorovaikutusKutsuSaamePDFt | null;
  lahetekirje?: LadattuTiedosto | null;
  asianhallintaEventId?: string | null;
  selosteVuorovaikutuskierrokselle?: string | null;
};

export type VuorovaikutusPDF = {
  kutsuPDFPath: string;
};

export type VuorovaikutusTilaisuus = {
  tyyppi: VuorovaikutusTilaisuusTyyppi;
  nimi?: LocalizedMap<string>;
  // yyyy-MM-dd
  paivamaara: string;
  // HH:mm
  alkamisAika: string;
  // HH:mm
  paattymisAika: string;
  kaytettavaPalvelu?: KaytettavaPalvelu | null;
  linkki?: string | null;
  paikka?: LocalizedMap<string> | null;
  osoite?: LocalizedMap<string> | null;
  postinumero?: string | null;
  postitoimipaikka?: LocalizedMap<string> | null;
  lisatiedot?: LocalizedMap<string> | null;
  esitettavatYhteystiedot?: StandardiYhteystiedot;
  peruttu?: boolean | null;
};

export type VuorovaikutusTilaisuusJulkaisu = {
  tyyppi: VuorovaikutusTilaisuusTyyppi;
  nimi?: LocalizedMap<string>;
  // yyyy-MM-dd
  paivamaara: string;
  // HH:mm
  alkamisAika: string;
  // HH:mm
  paattymisAika: string;
  kaytettavaPalvelu?: KaytettavaPalvelu | null;
  linkki?: string | null;
  paikka?: LocalizedMap<string> | null;
  osoite?: LocalizedMap<string> | null;
  postinumero?: string | null;
  postitoimipaikka?: LocalizedMap<string> | null;
  lisatiedot?: LocalizedMap<string> | null;
  yhteystiedot?: Yhteystieto[];
  esitettavatYhteystiedot?: StandardiYhteystiedot;
  peruttu?: boolean | null;
};

export type Linkki = {
  nimi: string;
  url: string;
};

export type VuorovaikutusKutsuSaamePDFt = {
  POHJOISSAAME?: LadattuTiedosto | null;
};
