import { Aineisto, LocalizedMap, Yhteystieto } from "./common";
import { IlmoituksenVastaanottajat, NahtavillaoloVaiheTila } from "../../../../common/graphql/apiModel";

export type NahtavillaoloVaihe = {
  aineistoNahtavilla?: Array<Aineisto> | null;
  lisaAineisto?: Array<Aineisto> | null;
  kuulutusPaiva?: string | null;
  kuulutusVaihePaattyyPaiva?: string | null;
  muistutusoikeusPaattyyPaiva?: string | null;
  hankkeenKuvaus?: LocalizedMap<string>;
  kuulutusYhteysHenkilot?: Array<string> | null;
  kuulutusYhteystiedot?: Array<Yhteystieto> | null;
  ilmoituksenVastaanottajat?: IlmoituksenVastaanottajat | null;
  palautusSyy?: string | null;
  tila: NahtavillaoloVaiheTila | null;
};
