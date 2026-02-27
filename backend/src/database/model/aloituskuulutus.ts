import { KuulutusJulkaisuTila } from "hassu-common/graphql/apiModel";
import {
  LocalizedMap,
  StandardiYhteystiedot,
  IlmoituksenVastaanottajat,
  UudelleenKuulutus,
  Yhteystieto,
  Velho,
  Kielitiedot,
  LadattuTiedosto,
} from "./common";
import { KuulutusSaamePDFt, SuunnitteluSopimusJulkaisu, ProjektinJakautuminen } from "./projekti";

export type AloitusKuulutus = {
  id: number;
  kuulutusPaiva?: string | null;
  siirtyySuunnitteluVaiheeseen?: string | null;
  hankkeenKuvaus?: LocalizedMap<string>;
  kuulutusYhteystiedot?: StandardiYhteystiedot;
  aloituskuulutusSaamePDFt?: KuulutusSaamePDFt | null;
  ilmoituksenVastaanottajat?: IlmoituksenVastaanottajat | null;
  palautusSyy?: string | null;
  uudelleenKuulutus?: UudelleenKuulutus | null;
};

export type AloitusKuulutusPDF = {
  aloituskuulutusPDFPath: string;
  aloituskuulutusIlmoitusPDFPath: string;
};

export type AloitusKuulutusJulkaisu = {
  id: number;
  kuulutusPaiva?: string | null;
  siirtyySuunnitteluVaiheeseen?: string | null;
  hankkeenKuvaus?: LocalizedMap<string>;
  yhteystiedot: Yhteystieto[];
  kuulutusYhteystiedot: StandardiYhteystiedot;
  velho: Velho;
  suunnitteluSopimus?: SuunnitteluSopimusJulkaisu | null;
  kielitiedot?: Kielitiedot | null;
  aloituskuulutusPDFt?: LocalizedMap<AloitusKuulutusPDF>;
  aloituskuulutusSaamePDFt?: KuulutusSaamePDFt | null;
  lahetekirje?: LadattuTiedosto | null;
  tila?: KuulutusJulkaisuTila | null;
  muokkaaja?: string | null;
  hyvaksyja?: string | null;
  hyvaksymisPaiva?: string | null;
  ilmoituksenVastaanottajat?: IlmoituksenVastaanottajat | null;
  uudelleenKuulutus?: UudelleenKuulutus | null;
  asianhallintaEventId?: string | null;
  kopioituProjektista?: string | null;
  projektinJakautuminen?: ProjektinJakautuminen;
};
