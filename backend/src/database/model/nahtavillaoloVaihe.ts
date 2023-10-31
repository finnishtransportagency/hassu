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
  uuid: string;
  legacy?: number; //nahtavillaoloVaiheId
  poistumisPaiva: string;
  lisaAineistot?: Array<Aineisto>;
  aineistopaketti?: string;
  muistiinpano?: string;
  poistetaan?: boolean;
};

export type LausuntoPyynnonTaydennys = {
  kunta: number;
  uuid: string;
  poistumisPaiva: string;
  muistutukset?: Array<Aineisto>;
  muuAineisto?: Array<Aineisto>;
  aineistopaketti?: string;
  poistetaan?: boolean;
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
