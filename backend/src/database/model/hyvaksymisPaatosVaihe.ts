import { Aineisto, LocalizedMap, Yhteystieto, IlmoituksenVastaanottajat } from "./common";
import { HyvaksymisPaatosVaiheTila, HallintoOikeus } from "../../../../common/graphql/apiModel";
import { Kielitiedot, Velho } from "./projekti";

export type HyvaksymisPaatosVaihe = {
  id: number;
  aineistoNahtavilla?: Array<Aineisto> | null;
  hyvaksymisPaatos?: Array<Aineisto> | null;
  kuulutusPaiva?: string | null;
  kuulutusVaihePaattyyPaiva?: string | null;
  hallintoOikeus?: HallintoOikeus | null;
  kuulutusYhteystiedot?: Array<Yhteystieto> | null;
  kuulutusYhteysHenkilot?: Array<string> | null;
  ilmoituksenVastaanottajat?: IlmoituksenVastaanottajat | null;
  palautusSyy?: string | null;
};

export type HyvaksymisPaatosVaiheJulkaisu = {
  id: number;
  aineistoNahtavilla?: Array<Aineisto> | null;
  hyvaksymisPaatos?: Array<Aineisto> | null;
  kuulutusPaiva?: string | null;
  kuulutusVaihePaattyyPaiva?: string | null;
  velho: Velho;
  kielitiedot: Kielitiedot;
  hallintoOikeus?: HallintoOikeus | null;
  kuulutusYhteystiedot?: Array<Yhteystieto> | null;
  kuulutusYhteysHenkilot?: Array<string> | null;
  ilmoituksenVastaanottajat?: IlmoituksenVastaanottajat | null;
  hyvaksymisPaatosVaihePDFt?: LocalizedMap<HyvaksymisPaatosVaihePDF>;
  tila?: HyvaksymisPaatosVaiheTila | null;
  muokkaaja?: string | null;
  hyvaksyja?: string | null;
};

export type HyvaksymisPaatosVaihePDF = {
  hyvaksymisKuulutusPDFPath: string;
  ilmoitusHyvaksymispaatoskuulutuksestaKunnillePDFPath: string;
  ilmoitusHyvaksymispaatoskuulutuksestaToiselleViranomaisellePDFPath: string;
  hyvaksymisIlmoitusLausunnonantajillePDFPath: string;
  hyvaksymisIlmoitusMuistuttajillePDFPath: string;
};
