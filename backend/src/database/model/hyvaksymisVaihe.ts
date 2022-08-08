import { Aineisto, LocalizedMap, Yhteystieto } from "./common";
import { IlmoituksenVastaanottajat, HyvaksymisVaiheTila, HallintoOikeus } from "../../../../common/graphql/apiModel";
import { Kielitiedot, Velho } from "./projekti";

export type HyvaksymisVaihe = {
  id: number;
  aineistoNahtavilla?: Array<Aineisto> | null;
  hyvaksymisPaatos?: Array<Aineisto> | null;
  kuulutusPaiva?: string | null;
  kuulutusVaihePaattyyPaiva?: string | null;
  hallintoOikeudet?: Array<HallintoOikeus> | null;
  kuulutusYhteystiedot?: Array<Yhteystieto> | null;
  ilmoituksenVastaanottajat?: IlmoituksenVastaanottajat | null;
  hyvaksymisVaihePDFt?: LocalizedMap<HyvaksymisVaihePDF>;
  palautusSyy?: string | null;
};

export type HyvaksymisVaiheJulkaisu = {
  id: number;
  aineistoNahtavilla?: Array<Aineisto> | null;
  hyvaksymisPaatos?: Array<Aineisto> | null;
  kuulutusPaiva?: string | null;
  kuulutusVaihePaattyyPaiva?: string | null;
  velho: Velho;
  kielitiedot: Kielitiedot;
  hallintoOikeudet: Array<HallintoOikeus> | null;
  kuulutusYhteystiedot?: Array<Yhteystieto> | null;
  ilmoituksenVastaanottajat?: IlmoituksenVastaanottajat | null;
  hyvaksymisVaihePDFt?: LocalizedMap<HyvaksymisVaihePDF>;
  tila?: HyvaksymisVaiheTila | null;
  muokkaaja?: string | null;
  hyvaksyja?: string | null;
};

export type HyvaksymisVaihePDF = {
  hyvaksymisKuulutusPDFPath: string;
  hyvaksymisIlmoitusPDFPath: string;
  hyvaksymisLahetekirjePDFPath: string;
  hyvaksymisIlmoitusLausunnonantajillePDFPath: string;
  hyvaksymisIlmoitusMuistuttajillePDFPath: string;
};
