import {
  Aineisto,
  IlmoituksenVastaanottajat,
  Kielitiedot,
  KuulutusSaamePDFt,
  LadattuTiedosto,
  LocalizedMap,
  StandardiYhteystiedot,
  UudelleenKuulutus,
  Velho,
  Yhteystieto,
  AineistoMuokkaus,
} from ".";
import { KuulutusJulkaisuTila } from "hassu-common/graphql/apiModel";

export type NahtavillaoloVaihe = {
  id: number;
  aineistoNahtavilla?: Array<Aineisto> | null;
  lisaAineisto?: Array<Aineisto> | null;
  aineistopaketti?: string | null;
  kuulutusPaiva?: string | null;
  kuulutusVaihePaattyyPaiva?: string | null;
  muistutusoikeusPaattyyPaiva?: string | null;
  hankkeenKuvaus?: LocalizedMap<string>;
  kuulutusYhteystiedot?: StandardiYhteystiedot;
  ilmoituksenVastaanottajat?: IlmoituksenVastaanottajat | null;
  nahtavillaoloSaamePDFt?: KuulutusSaamePDFt | null;
  palautusSyy?: string | null;
  uudelleenKuulutus?: UudelleenKuulutus | null;
  aineistoMuokkaus?: AineistoMuokkaus | null;
};

export type NahtavillaoloVaiheJulkaisu = {
  id: number;
  aineistoNahtavilla?: Array<Aineisto> | null;
  lisaAineisto?: Array<Aineisto> | null;
  aineistopaketti?: string | null;
  kuulutusPaiva?: string | null;
  kuulutusVaihePaattyyPaiva?: string | null;
  muistutusoikeusPaattyyPaiva?: string | null;
  hankkeenKuvaus?: LocalizedMap<string>;
  velho: Velho;
  kielitiedot: Kielitiedot;
  yhteystiedot: Yhteystieto[];
  kuulutusYhteystiedot: StandardiYhteystiedot;
  ilmoituksenVastaanottajat?: IlmoituksenVastaanottajat | null;
  nahtavillaoloSaamePDFt?: KuulutusSaamePDFt | null;
  nahtavillaoloPDFt?: LocalizedMap<NahtavillaoloPDF>;
  lahetekirje?: LadattuTiedosto | null;
  tila?: KuulutusJulkaisuTila | null;
  muokkaaja?: string | null;
  hyvaksyja?: string | null;
  uudelleenKuulutus?: UudelleenKuulutus | null;
  aineistoMuokkaus?: AineistoMuokkaus | null;
  hyvaksymisPaiva?: string | null;
  asianhallintaEventId?: string | null;
};

export type LausuntoPyynto = {
  id: number;
  legacy?: number; //nahtavillaoloVaiheId
  poistumisPaiva: string;
  lisaAineistot?: Array<Aineisto>;
  aineistopaketti?: string;
  muistiinpano?: string;
  poistetaan?: boolean;
  // Tällä varmistetaan se, että jos poistetaan lausuntopyyntö id:llä x ja
  // luodaan uusi, jonka id:ksi tulee myös x, niin vanhan lausuntopyynnön linkillä
  // ei pääse uuden lausuntopyynnön aineistoihin.
  luontiPaiva: string;
};

export type LausuntoPyynnonTaydennys = {
  kunta: number;
  poistumisPaiva: string;
  muistutukset?: Array<Aineisto>;
  muuAineisto?: Array<Aineisto>;
  aineistopaketti?: string;
  poistetaan?: boolean;
  // Tällä varmistetaan se, että jos poistetaan lausuntopyynnön täydennys kunnalle x ja
  // luodaan uusi, jonka kunnaksi tulee myös x, niin vanhan lausuntopyynnön täydennyksen linkillä
  // ei pääse uuden lausuntopyynnön täydennyksen aineistoihin.
  // Koska projektin kunnat eivät yleensä muutu, tämä on vain super-erikoistapauksia varten.
  luontiPaiva: string;
};

export type NahtavillaoloPDF = {
  nahtavillaoloPDFPath: string;
  nahtavillaoloIlmoitusPDFPath: string;
  nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath: string;
};

export type Muistutus = {
  id: string;
  vastaanotettu: string;
  etunimi?: string | null;
  sukunimi?: string | null;
  katuosoite?: string | null;
  postinumeroJaPostitoimipaikka?: string | null;
  sahkoposti?: string | null;
  puhelinnumero?: string | null;
  muistutus?: string | null;
  liite?: string | null;
};
