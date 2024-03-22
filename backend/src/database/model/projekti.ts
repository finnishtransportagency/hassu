import { ELY, KayttajaTyyppi, KuulutusJulkaisuTila, ProjektiTyyppi, Status } from "hassu-common/graphql/apiModel";
import {
  IlmoituksenVastaanottajat,
  Kielitiedot,
  LadattuTiedosto,
  LocalizedMap,
  SaameLocalizedMap,
  StandardiYhteystiedot,
  UudelleenKuulutus,
  Velho,
  Yhteystieto,
  VuorovaikutusKierros,
  VuorovaikutusKierrosJulkaisu,
  NahtavillaoloVaihe,
  NahtavillaoloVaiheJulkaisu,
  HyvaksymisPaatosVaihe,
  HyvaksymisPaatosVaiheJulkaisu,
  LausuntoPyynto,
  LausuntoPyynnonTaydennys,
} from ".";
import { suunnitelmanTilat } from "hassu-common/generated/kasittelynTila";
import { AsianhallintaSynkronointi } from "@hassu/asianhallinta";
import { HyvaksymisEsitys } from "./hyvaksymisEsitys";

export type DBVaylaUser = {
  email: string;
  kayttajatunnus: string;
  puhelinnumero?: string;
  organisaatio: string;
  etunimi: string;
  sukunimi: string;
  tyyppi?: KayttajaTyyppi | null;
  muokattavissa?: boolean;
  yleinenYhteystieto?: boolean;
  elyOrganisaatio?: ELY;
};

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

export type KuulutusSaamePDFt = SaameLocalizedMap<KuulutusSaamePDF>;

export type KuulutusSaamePDF = {
  kuulutusPDF?: LadattuTiedosto | null;
  kuulutusIlmoitusPDF?: LadattuTiedosto | null;
};

export type AloitusKuulutusJulkaisu = {
  id: number;
  kuulutusPaiva?: string | null;
  siirtyySuunnitteluVaiheeseen?: string | null;
  hankkeenKuvaus?: LocalizedMap<string>;
  elyKeskus?: string | null;
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
};

export type SuunnitteluSopimus = {
  kunta: number;
  logo?: LocalizedMap<string> | null;
  yhteysHenkilo: string;
};

export type SuunnitteluSopimusJulkaisu = {
  kunta: number;
  logo?: LocalizedMap<string> | null;
  etunimi: string;
  sukunimi: string;
  puhelinnumero: string;
  email: string;
};

export type Suunnitelma = {
  asiatunnus: string;
  nimi: string;
};

export type KasittelynTila = {
  suunnitelmanTila?: keyof typeof suunnitelmanTilat; // Esimerkiksi "suunnitelman-tila/sutil01"
  hyvaksymisesitysTraficomiinPaiva?: string;
  ennakkoneuvotteluPaiva?: string;
  hyvaksymispaatos?: Hyvaksymispaatos;
  ensimmainenJatkopaatos?: Hyvaksymispaatos;
  toinenJatkopaatos?: Hyvaksymispaatos;
  valitustenMaara?: number;
  lainvoimaAlkaen?: string;
  lainvoimaPaattyen?: string;
  liikenteeseenluovutusOsittain?: string;
  liikenteeseenluovutusKokonaan?: string;
  hallintoOikeus?: OikeudenPaatos;
  korkeinHallintoOikeus?: OikeudenPaatos;
  lisatieto?: string;
};

export type OikeudenPaatos = {
  valipaatos?: Paatos;
  paatos?: Paatos;
  hyvaksymisPaatosKumottu: boolean;
};

export type Paatos = {
  paiva?: string;
  sisalto?: string;
};

export type Hyvaksymispaatos = {
  paatoksenPvm?: string | null;
  asianumero?: string;
  aktiivinen?: boolean;
};

export type DBProjekti = {
  oid: string;
  versio: number;
  lyhytOsoite?: string | null;
  muistiinpano?: string | null;
  vaihe?: string | null;
  /**
   * @deprecated velho.tyyppi is the correct one
   */
  tyyppi?: ProjektiTyyppi | null;
  kielitiedot?: Kielitiedot | null;
  euRahoitus?: boolean | null;
  euRahoitusLogot?: LocalizedMap<string> | null;
  vahainenMenettely?: boolean | null;
  aloitusKuulutus?: AloitusKuulutus | null;
  aloitusKuulutusJulkaisut?: AloitusKuulutusJulkaisu[] | null;
  suunnitteluSopimus?: SuunnitteluSopimus | null;
  velho?: Velho | null;
  vuorovaikutusKierros?: VuorovaikutusKierros | null;
  vuorovaikutusKierrosJulkaisut?: VuorovaikutusKierrosJulkaisu[] | null;
  hyvaksymisEsitys?: HyvaksymisEsitys | null;
  nahtavillaoloVaihe?: NahtavillaoloVaihe | null;
  nahtavillaoloVaiheJulkaisut?: NahtavillaoloVaiheJulkaisu[] | null;
  lausuntoPyynnot?: LausuntoPyynto[] | null;
  lausuntoPyynnonTaydennykset?: LausuntoPyynnonTaydennys[] | null;
  hyvaksymisPaatosVaihe?: HyvaksymisPaatosVaihe | null;
  hyvaksymisPaatosVaiheJulkaisut?: HyvaksymisPaatosVaiheJulkaisu[] | null;
  jatkoPaatos1Vaihe?: HyvaksymisPaatosVaihe | null;
  jatkoPaatos1VaiheJulkaisut?: HyvaksymisPaatosVaiheJulkaisu[] | null;
  jatkoPaatos2Vaihe?: HyvaksymisPaatosVaihe | null;
  jatkoPaatos2VaiheJulkaisut?: HyvaksymisPaatosVaiheJulkaisu[] | null;
  uusiaPalautteita?: number;

  // false, jos projekti ladattiin Velhosta, mutta ei ole vielä tallennettu tietokantaan
  tallennettu?: boolean;
  kayttoOikeudet: DBVaylaUser[];
  paivitetty?: string;
  // Secret salt to use when generating lisaaineisto links within this projekti
  salt?: string;
  kasittelynTila?: KasittelynTila | null;
  // Map asianhallintaEventId -> AsianhallintaSynkronointi
  synkronoinnit?: Record<string, AsianhallintaSynkronointi>;
  annetutMuistutukset?: string[];
  asianhallinta?: Asianhallinta;
  muistuttajat?: string[];
  muutMuistuttajat?: string[];
  omistajahaku?: OmistajaHaku | null;
};

export type OmistajaHaku = {
  virhe?: boolean | null;
  kaynnistetty?: string | null;
  kiinteistotunnusMaara?: number | null;
  status?: Status | null;
};

export type Asianhallinta = {
  inaktiivinen?: boolean;
  asiaId?: number;
};

export type PartialDBProjekti = Partial<DBProjekti> & Pick<DBProjekti, "oid" | "versio">;
