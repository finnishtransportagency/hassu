import {
  Aineisto,
  IlmoituksenVastaanottajat,
  Kielitiedot,
  LocalizedMap,
  StandardiYhteystiedot,
  UudelleenKuulutus,
  Velho,
  Yhteystieto,
} from "./common";
import { HallintoOikeus, KuulutusJulkaisuTila } from "../../../../common/graphql/apiModel";
import { KuulutusSaamePDFt } from "./projekti";

export type HyvaksymisPaatosVaihe = {
  id: number;
  aineistoNahtavilla?: Array<Aineisto> | null;
  hyvaksymisPaatos?: Array<Aineisto> | null;
  kuulutusPaiva?: string | null;
  kuulutusVaihePaattyyPaiva?: string | null;
  hallintoOikeus?: HallintoOikeus | null;
  hyvaksymisPaatosVaiheSaamePDFt?: KuulutusSaamePDFt | null;
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
  hyvaksymisPaatosVaiheSaamePDFt?: KuulutusSaamePDFt | null;
  tila?: KuulutusJulkaisuTila | null;
  muokkaaja?: string | null;
  hyvaksyja?: string | null;
  uudelleenKuulutus?: UudelleenKuulutus | null;
  hyvaksymisPaiva?: string | null;
};

export type HyvaksymisPaatosVaihePDF = {
  hyvaksymisKuulutusPDFPath: string;
  ilmoitusHyvaksymispaatoskuulutuksestaKunnalleToiselleViranomaisellePDFPath: string;
  ilmoitusHyvaksymispaatoskuulutuksestaPDFPath: string;
  hyvaksymisIlmoitusLausunnonantajillePDFPath: string;
  hyvaksymisIlmoitusMuistuttajillePDFPath: string;
};
