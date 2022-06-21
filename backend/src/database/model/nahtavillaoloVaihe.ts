import { Aineisto, LocalizedMap, Yhteystieto } from "./common";
import { IlmoituksenVastaanottajat, NahtavillaoloVaiheTila } from "../../../../common/graphql/apiModel";
import { Kielitiedot, Velho } from "./projekti";

export type NahtavillaoloVaihe = {
  id: number;
  aineistoNahtavilla?: Array<Aineisto> | null;
  lisaAineisto?: Array<Aineisto> | null;
  kuulutusPaiva?: string | null;
  kuulutusVaihePaattyyPaiva?: string | null;
  muistutusoikeusPaattyyPaiva?: string | null;
  hankkeenKuvaus?: LocalizedMap<string>;
  kuulutusYhteysHenkilot?: Array<string> | null;
  kuulutusYhteystiedot?: Array<Yhteystieto> | null;
  ilmoituksenVastaanottajat?: IlmoituksenVastaanottajat | null;
  nahtavillaoloPDFt?: LocalizedMap<NahtavillaoloPDF>;
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
  kuulutusYhteysHenkilot?: Array<string> | null;
  kuulutusYhteystiedot?: Array<Yhteystieto> | null;
  ilmoituksenVastaanottajat?: IlmoituksenVastaanottajat | null;
  nahtavillaoloPDFt?: LocalizedMap<NahtavillaoloPDF>;
  tila?: NahtavillaoloVaiheTila | null;
  muokkaaja?: string | null;
  hyvaksyja?: string | null;
};

export type NahtavillaoloPDF = {
  nahtavillaoloPDFPath: string;
  nahtavillaoloIlmoitusPDFPath: string;
  nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath: string;
};
