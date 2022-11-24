import { Aineisto, LocalizedMap, Yhteystieto, IlmoituksenVastaanottajat, StandardiYhteystiedot, Kielitiedot, Velho } from "./common";
import { KuulutusJulkaisuTila } from "../../../../common/graphql/apiModel";

export type NahtavillaoloVaihe = {
  id: number;
  aineistoNahtavilla?: Array<Aineisto> | null;
  lisaAineisto?: Array<Aineisto> | null;
  kuulutusPaiva?: string | null;
  kuulutusVaihePaattyyPaiva?: string | null;
  muistutusoikeusPaattyyPaiva?: string | null;
  hankkeenKuvaus?: LocalizedMap<string>;
  kuulutusYhteystiedot?: StandardiYhteystiedot;
  ilmoituksenVastaanottajat?: IlmoituksenVastaanottajat | null;
  palautusSyy?: string | null;
};

export type NahtavillaoloVaiheJulkaisu = {
  id: number;
  aineistoNahtavilla?: Array<Aineisto> | null;
  lisaAineisto?: Array<Aineisto> | null;
  kuulutusPaiva?: string | null;
  kuulutusVaihePaattyyPaiva?: string | null;
  muistutusoikeusPaattyyPaiva?: string | null;
  hankkeenKuvaus?: LocalizedMap<string>;
  velho: Velho;
  kielitiedot: Kielitiedot;
  yhteystiedot: Yhteystieto[];
  ilmoituksenVastaanottajat?: IlmoituksenVastaanottajat | null;
  nahtavillaoloPDFt?: LocalizedMap<NahtavillaoloPDF>;
  tila?: KuulutusJulkaisuTila | null;
  muokkaaja?: string | null;
  hyvaksyja?: string | null;
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
