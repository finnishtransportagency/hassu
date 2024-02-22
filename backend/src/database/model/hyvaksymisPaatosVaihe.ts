import {
  Aineisto,
  AineistoMuokkaus,
  IlmoituksenVastaanottajat,
  Kielitiedot,
  LadattuTiedosto,
  LocalizedMap,
  StandardiYhteystiedot,
  UudelleenKuulutus,
  Velho,
  Yhteystieto,
  KuulutusSaamePDFt,
} from ".";
import { HallintoOikeus, KuulutusJulkaisuTila } from "hassu-common/graphql/apiModel";

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
  aineistoMuokkaus?: AineistoMuokkaus | null;
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
  kuulutusYhteystiedot: StandardiYhteystiedot;
  ilmoituksenVastaanottajat?: IlmoituksenVastaanottajat | null;
  hyvaksymisPaatosVaihePDFt?: LocalizedMap<HyvaksymisPaatosVaihePDF>;
  hyvaksymisPaatosVaiheSaamePDFt?: KuulutusSaamePDFt | null;
  lahetekirje?: LadattuTiedosto | null;
  tila?: KuulutusJulkaisuTila | null;
  muokkaaja?: string | null;
  hyvaksyja?: string | null;
  uudelleenKuulutus?: UudelleenKuulutus | null;
  aineistoMuokkaus?: AineistoMuokkaus | null;
  hyvaksymisPaiva?: string | null;
  asianhallintaEventId?: string | null;
  viimeinenVoimassaolovuosi?: string | null;
  maanomistajaluettelo?: string | null;
};

export type HyvaksymisPaatosVaihePDF = {
  hyvaksymisKuulutusPDFPath: string;
  ilmoitusHyvaksymispaatoskuulutuksestaKunnalleToiselleViranomaisellePDFPath: string;
  ilmoitusHyvaksymispaatoskuulutuksestaPDFPath: string;
  hyvaksymisIlmoitusLausunnonantajillePDFPath: string;
  hyvaksymisIlmoitusMuistuttajillePDFPath?: string;
};
