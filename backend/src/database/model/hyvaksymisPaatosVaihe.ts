import {
  Aineisto,
  LocalizedMap,
  Yhteystieto,
  IlmoituksenVastaanottajat,
  Velho,
  Kielitiedot,
  StandardiYhteystiedot,
  UudelleenKuulutus,
} from "./common";
import { HallintoOikeus, KuulutusJulkaisuTila } from "../../../../common/graphql/apiModel";

export type HyvaksymisPaatosVaihe = {
  id: number;
  aineistoNahtavilla?: Array<Aineisto> | null;
  hyvaksymisPaatos?: Array<Aineisto> | null;
  kuulutusPaiva?: string | null;
  kuulutusVaihePaattyyPaiva?: string | null;
  hallintoOikeus?: HallintoOikeus | null;
  kuulutusYhteystiedot?: StandardiYhteystiedot;
  ilmoituksenVastaanottajat?: IlmoituksenVastaanottajat | null;
  palautusSyy?: string | null;
  viimeinenVoimassaolovuosi?: string | null;
  uudelleenKuulutus?: UudelleenKuulutus | null;
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
  yhteystiedot: Yhteystieto[];
  ilmoituksenVastaanottajat?: IlmoituksenVastaanottajat | null;
  hyvaksymisPaatosVaihePDFt?: LocalizedMap<HyvaksymisPaatosVaihePDF>;
  tila?: KuulutusJulkaisuTila | null;
  muokkaaja?: string | null;
  hyvaksyja?: string | null;
  uudelleenKuulutus?: UudelleenKuulutus | null;
};

export type HyvaksymisPaatosVaihePDF = {
  hyvaksymisKuulutusPDFPath: string;
  ilmoitusHyvaksymispaatoskuulutuksestaKunnillePDFPath: string;
  ilmoitusHyvaksymispaatoskuulutuksestaToiselleViranomaisellePDFPath: string;
  hyvaksymisIlmoitusLausunnonantajillePDFPath: string;
  hyvaksymisIlmoitusMuistuttajillePDFPath: string;
};
