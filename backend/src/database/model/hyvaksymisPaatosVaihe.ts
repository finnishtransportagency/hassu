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
  ProjektinJakautuminen,
  hyvaksymisPaatosVaiheJulkaisuPrefix,
  jatkopaatos1VaiheJulkaisuPrefix,
  jatkopaatos2VaiheJulkaisuPrefix,
} from ".";
import { HallintoOikeus, KuulutusJulkaisuTila } from "hassu-common/graphql/apiModel";
import { IProjektiDataItem } from "./IProjektiDataItem";

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
  alkuperainenPaatos?: Array<Aineisto> | null;
};

export interface HyvaksymisPaatosVaiheJulkaisu
  extends IProjektiDataItem<{ sortKey: `${typeof hyvaksymisPaatosVaiheJulkaisuPrefix}${string}` }>,
    PaatosVaiheJulkaisuTiedot {}
export interface JatkoPaatos1VaiheJulkaisu
  extends IProjektiDataItem<{ sortKey: `${typeof jatkopaatos1VaiheJulkaisuPrefix}${string}` }>,
    PaatosVaiheJulkaisuTiedot {}
export interface JatkoPaatos2VaiheJulkaisu
  extends IProjektiDataItem<{ sortKey: `${typeof jatkopaatos2VaiheJulkaisuPrefix}${string}` }>,
    PaatosVaiheJulkaisuTiedot {}

export type PaatosVaiheJulkaisu = HyvaksymisPaatosVaiheJulkaisu | JatkoPaatos1VaiheJulkaisu | JatkoPaatos2VaiheJulkaisu;

export interface PaatosVaiheJulkaisuTiedot {
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
  kopioituProjektista?: string | null;
  projektinJakautuminen?: ProjektinJakautuminen;
  alkuperainenPaatos?: Array<Aineisto> | null;
}

export type HyvaksymisPaatosVaihePDF = {
  hyvaksymisKuulutusPDFPath: string;
  ilmoitusHyvaksymispaatoskuulutuksestaKunnalleToiselleViranomaisellePDFPath: string;
  ilmoitusHyvaksymispaatoskuulutuksestaPDFPath: string;
  hyvaksymisIlmoitusLausunnonantajillePDFPath: string;
  hyvaksymisIlmoitusMuistuttajillePDFPath?: string;
};
