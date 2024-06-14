import {
  Aineisto,
  AloitusKuulutusJulkaisu,
  DBProjekti,
  HyvaksymisPaatosVaiheJulkaisu,
  KasittelynTila,
  NahtavillaoloVaihe,
  NahtavillaoloVaiheJulkaisu,
  Velho,
  VuorovaikutusKierros,
} from "../../database/model";
import * as API from "hassu-common/graphql/apiModel";
import { DateAddTuple, isDateTimeInThePast } from "../../util/dateUtil";
import { kategorisoimattomatId } from "hassu-common/aineistoKategoriat";
import { GenericDbKuulutusJulkaisu, findJulkaisuWithTila } from "../projektiUtil";
import { kayttoOikeudetSchema } from "../../../../src/schemas/kayttoOikeudet";
import { perustiedotValidationSchema } from "../../../../src/schemas/perustiedot";
import { ValidationError } from "yup";
import { adaptAsianhallinta } from "../adapter/adaptAsianhallinta";
import { adaptDBVaylaUsertoAPIProjektiKayttaja } from "../adapter/adaptToAPI";

export const HYVAKSYMISPAATOS_DURATION: DateAddTuple = [1, "year"];
export const JATKOPAATOS_DURATION: DateAddTuple = [6, "months"];

type JulkaisunTarpeellisetTiedot = Pick<
  NahtavillaoloVaiheJulkaisu,
  "tila" | "kuulutusPaiva" | "kuulutusVaihePaattyyPaiva" | "aineistoNahtavilla"
>;

type ProjektiForGetStatus = Pick<
  DBProjekti,
  | "kielitiedot"
  | "euRahoitus"
  | "kayttoOikeudet"
  | "vahainenMenettely"
  | "kasittelynTila"
  | "aloitusKuulutus"
  | "vuorovaikutusKierros"
  | "nahtavillaoloVaihe"
  | "hyvaksymisPaatosVaihe"
> & {
  velho?: Pick<Velho, "suunnittelustaVastaavaViranomainen" | "nimi" | "asiatunnusELY" | "asiatunnusVayla"> | null;
  aloitusKuulutusJulkaisut?: Pick<AloitusKuulutusJulkaisu, "tila" | "kuulutusPaiva">[] | null;
  nahtavillaoloVaiheJulkaisut?: JulkaisunTarpeellisetTiedot[] | null;
  hyvaksymisPaatosVaiheJulkaisut?: JulkaisunTarpeellisetTiedot[] | null;
  jatkoPaatos1VaiheJulkaisut?: JulkaisunTarpeellisetTiedot[] | null;
  jatkoPaatos2VaiheJulkaisut?: JulkaisunTarpeellisetTiedot[] | null;
};

export default async function getProjektiStatus(projekti: ProjektiForGetStatus) {
  if (projektiHenkiloissaOnOngelma(projekti)) {
    return API.Status.EI_JULKAISTU_PROJEKTIN_HENKILOT;
  }

  if (await projektinPerustiedoissaOnOngelma(projekti)) {
    return API.Status.EI_JULKAISTU;
  }

  const jatkoPaatos2Julkaisu = getJulkaisu(projekti.jatkoPaatos2VaiheJulkaisut);

  if (projektiOnEpaAktiivinen3({ jatkoPaatos2Julkaisu })) {
    return API.Status.EPAAKTIIVINEN_3;
  }

  const jatkoPaatos2AineistoKunnossa = aineistoNahtavillaIsOk(jatkoPaatos2Julkaisu?.aineistoNahtavilla);

  const kasittelynTila = projekti.kasittelynTila;

  if (projektinStatusOnVahintaanJatkoPaatos2({ kasittelynTila, jatkoPaatos2AineistoKunnossa })) {
    return API.Status.JATKOPAATOS_2;
  }

  if (projektinStatusOnVahintaanJatkoPaatos2Aineistot({ kasittelynTila, jatkoPaatos2AineistoKunnossa })) {
    return API.Status.JATKOPAATOS_2_AINEISTOT;
  }

  const jatkoPaatos1Julkaisu = getJulkaisu(projekti.jatkoPaatos1VaiheJulkaisut);

  if (projektiOnVahintaanEpaAktiivinen2({ jatkoPaatos1Julkaisu })) {
    return API.Status.EPAAKTIIVINEN_2;
  }

  const jatkoPaatos1AineistoKunnossa = aineistoNahtavillaIsOk(jatkoPaatos1Julkaisu?.aineistoNahtavilla);

  if (projektinStatusOnVahintaanJatkoPaatos1({ kasittelynTila, jatkoPaatos1AineistoKunnossa })) {
    return API.Status.JATKOPAATOS_1;
  }

  if (projektinStatusOnVahintaanJatkoPaatos1Aineistot({ kasittelynTila, jatkoPaatos1AineistoKunnossa })) {
    return API.Status.JATKOPAATOS_1_AINEISTOT;
  }

  if (projektinStatusOnVahintaanEpaAktiivinen1({ projekti })) {
    return API.Status.EPAAKTIIVINEN_1;
  }

  const nahtavillaoloVaiheJulkaisu = getJulkaisu(projekti.nahtavillaoloVaiheJulkaisut);
  const nahtavillaoloJulkaisunTila = nahtavillaoloVaiheJulkaisu?.tila;
  const nahtavillaoloVaihePaattyyPaiva = nahtavillaoloVaiheJulkaisu?.kuulutusVaihePaattyyPaiva;
  const nahtavillaoloMigroituTaiKuulutusaikaOhi =
    (nahtavillaoloJulkaisunTila == API.KuulutusJulkaisuTila.HYVAKSYTTY &&
      isDateTimeInThePast(nahtavillaoloVaihePaattyyPaiva, "end-of-day")) ||
    nahtavillaoloJulkaisunTila == API.KuulutusJulkaisuTila.MIGROITU;
  const hyvaksymisPaatosVaiheAineistoKunnossa =
    aineistoNahtavillaIsOk(projekti.hyvaksymisPaatosVaihe?.aineistoNahtavilla) &&
    !!projekti.hyvaksymisPaatosVaihe?.hyvaksymisPaatos?.length;

  if (
    projektinStatusOnVahintaanHyvaksytty({ kasittelynTila, nahtavillaoloMigroituTaiKuulutusaikaOhi, hyvaksymisPaatosVaiheAineistoKunnossa })
  ) {
    return API.Status.HYVAKSYTTY;
  }

  if (
    projektiOnVahintaanHyvaksymismenettelyssa({
      kasittelynTila,
      nahtavillaoloMigroituTaiKuulutusaikaOhi,
      hyvaksymisPaatosVaiheAineistoKunnossa,
    })
  ) {
    return API.Status.HYVAKSYMISMENETTELYSSA;
  }

  if (
    projektinStatusOnVahintaanHyvaksymismenettelyssaAineistot({
      nahtavillaoloMigroituTaiKuulutusaikaOhi,
      hyvaksymisPaatosVaiheAineistoKunnossa,
    })
  ) {
    return API.Status.HYVAKSYMISMENETTELYSSA_AINEISTOT;
  }

  if (projektinStatusOnVahintaanNahtavillaolo({ projekti })) {
    return API.Status.NAHTAVILLAOLO;
  }

  if (projektinStatusOnVahintaanNahtavillaoloAineistot({ projekti })) {
    return API.Status.NAHTAVILLAOLO_AINEISTOT;
  }

  if (projektinStatusOnVahintaanSuunnittelu({ projekti })) {
    return API.Status.SUUNNITTELU;
  }

  return API.Status.ALOITUSKUULUTUS;
}

function aineistoNahtavillaIsOk(aineistoNahtavilla?: Aineisto[] | null | undefined): boolean {
  return (
    !!aineistoNahtavilla?.length &&
    !aineistoNahtavilla.some((aineisto) => !aineisto.kategoriaId || aineisto.kategoriaId === kategorisoimattomatId)
  );
}

function getJulkaisu<A extends Pick<GenericDbKuulutusJulkaisu, "tila" | "kuulutusPaiva">>(
  julkaisut: A[] | null | undefined
): A | undefined {
  return (
    findJulkaisuWithTila(julkaisut, API.KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA) ??
    findJulkaisuWithTila(julkaisut, API.KuulutusJulkaisuTila.HYVAKSYTTY) ??
    findJulkaisuWithTila(julkaisut, API.KuulutusJulkaisuTila.PERUUTETTU) ??
    findJulkaisuWithTila(julkaisut, API.KuulutusJulkaisuTila.MIGROITU)
  );
}

function projektiHenkiloissaOnOngelma(projekti: ProjektiForGetStatus): boolean {
  try {
    kayttoOikeudetSchema.validateSync(projekti.kayttoOikeudet, {
      context: {
        projekti: {
          kayttoOikeudet: adaptDBVaylaUsertoAPIProjektiKayttaja(projekti.kayttoOikeudet),
        },
      },
    });
  } catch (e) {
    if (e instanceof ValidationError) {
      return true;
    } else {
      throw e;
    }
  }
  return false;
}

async function projektinPerustiedoissaOnOngelma(projekti: ProjektiForGetStatus): Promise<boolean> {
  try {
    perustiedotValidationSchema.validateSync(projekti, {
      context: {
        projekti: {
          asianhallinta: await adaptAsianhallinta(projekti), // Ainoat tiedot mitä testit käyttävät kontekstista
          velho: {
            suunnittelustaVastaavaViranomainen: projekti.velho?.suunnittelustaVastaavaViranomainen,
            asiatunnusVayla: projekti.velho?.asiatunnusVayla,
            asiatunnusELY: projekti.velho?.asiatunnusELY,
          },
        },
        isRuotsinkielinenProjekti: {
          current: [projekti.kielitiedot?.ensisijainenKieli, projekti.kielitiedot?.toissijainenKieli].includes(API.Kieli.RUOTSI),
        },
        hasEuRahoitus: { current: !!projekti.euRahoitus },
      },
    });
  } catch (e) {
    if (e instanceof ValidationError) {
      return true;
    } else {
      throw e;
    }
  }
  return false;
}

function projektiOnEpaAktiivinen3({
  jatkoPaatos2Julkaisu,
}: {
  jatkoPaatos2Julkaisu: Pick<HyvaksymisPaatosVaiheJulkaisu, "tila" | "kuulutusVaihePaattyyPaiva"> | undefined;
}): boolean {
  const jatkoPaatos2JulkaisunTila = jatkoPaatos2Julkaisu?.tila;
  const kuulutusJP2VaihePaattyyPaiva = jatkoPaatos2Julkaisu?.kuulutusVaihePaattyyPaiva;
  if (
    (jatkoPaatos2JulkaisunTila == API.KuulutusJulkaisuTila.HYVAKSYTTY &&
      isDateTimeInThePast(kuulutusJP2VaihePaattyyPaiva, "end-of-day", JATKOPAATOS_DURATION)) ||
    jatkoPaatos2JulkaisunTila == API.KuulutusJulkaisuTila.MIGROITU
  ) {
    return true;
  }
  return false;
}

function projektinStatusOnVahintaanJatkoPaatos2({
  kasittelynTila,
  jatkoPaatos2AineistoKunnossa,
}: {
  kasittelynTila: KasittelynTila | undefined | null;
  jatkoPaatos2AineistoKunnossa: boolean;
}): boolean {
  if (kasittelynTila?.toinenJatkopaatos?.asianumero && kasittelynTila?.toinenJatkopaatos?.paatoksenPvm) {
    if (jatkoPaatos2AineistoKunnossa) {
      return true;
    }
  }
  return false;
}

function projektinStatusOnVahintaanJatkoPaatos2Aineistot({
  kasittelynTila,
  jatkoPaatos2AineistoKunnossa,
}: {
  kasittelynTila: KasittelynTila | undefined | null;
  jatkoPaatos2AineistoKunnossa: boolean;
}): boolean {
  if (kasittelynTila?.toinenJatkopaatos?.asianumero && kasittelynTila?.toinenJatkopaatos?.paatoksenPvm) {
    if (!jatkoPaatos2AineistoKunnossa) {
      return true;
    }
  }
  return false;
}

function projektiOnVahintaanEpaAktiivinen2({
  jatkoPaatos1Julkaisu,
}: {
  jatkoPaatos1Julkaisu: Pick<HyvaksymisPaatosVaiheJulkaisu, "tila" | "kuulutusVaihePaattyyPaiva"> | undefined;
}): boolean {
  const jatkoPaatos1JulkaisunTila = jatkoPaatos1Julkaisu?.tila;
  const kuulutusJP1VaihePaattyyPaiva = jatkoPaatos1Julkaisu?.kuulutusVaihePaattyyPaiva;

  if (
    (jatkoPaatos1JulkaisunTila == API.KuulutusJulkaisuTila.HYVAKSYTTY &&
      isDateTimeInThePast(kuulutusJP1VaihePaattyyPaiva, "end-of-day", JATKOPAATOS_DURATION)) ||
    jatkoPaatos1JulkaisunTila == API.KuulutusJulkaisuTila.MIGROITU
  ) {
    return true;
  }
  return false;
}

function projektinStatusOnVahintaanJatkoPaatos1({
  kasittelynTila,
  jatkoPaatos1AineistoKunnossa,
}: {
  kasittelynTila: KasittelynTila | undefined | null;
  jatkoPaatos1AineistoKunnossa: boolean;
}): boolean {
  if (kasittelynTila?.ensimmainenJatkopaatos?.asianumero && kasittelynTila?.ensimmainenJatkopaatos?.paatoksenPvm) {
    if (jatkoPaatos1AineistoKunnossa) {
      return true;
    }
  }
  return false;
}

function projektinStatusOnVahintaanJatkoPaatos1Aineistot({
  kasittelynTila,
  jatkoPaatos1AineistoKunnossa,
}: {
  kasittelynTila: KasittelynTila | undefined | null;
  jatkoPaatos1AineistoKunnossa: boolean;
}): boolean {
  if (kasittelynTila?.ensimmainenJatkopaatos?.asianumero && kasittelynTila?.ensimmainenJatkopaatos?.paatoksenPvm) {
    if (!jatkoPaatos1AineistoKunnossa) {
      return true;
    }
  }
  return false;
}

function projektinStatusOnVahintaanEpaAktiivinen1({
  projekti,
}: {
  projekti: { hyvaksymisPaatosVaiheJulkaisut?: Pick<HyvaksymisPaatosVaiheJulkaisu, "tila" | "kuulutusVaihePaattyyPaiva">[] | null };
}): boolean {
  const hyvaksymisPaatosJulkaisu = getJulkaisu(projekti.hyvaksymisPaatosVaiheJulkaisut);
  const hyvaksymisPaatosJulkaisunTila = hyvaksymisPaatosJulkaisu?.tila;
  const kuulutusVaihePaattyyPaiva = hyvaksymisPaatosJulkaisu?.kuulutusVaihePaattyyPaiva;

  if (
    (hyvaksymisPaatosJulkaisunTila == API.KuulutusJulkaisuTila.HYVAKSYTTY &&
      isDateTimeInThePast(kuulutusVaihePaattyyPaiva, "end-of-day", HYVAKSYMISPAATOS_DURATION)) ||
    hyvaksymisPaatosJulkaisunTila == API.KuulutusJulkaisuTila.MIGROITU
  ) {
    return true;
  }
  return false;
}

function projektinStatusOnVahintaanHyvaksytty({
  kasittelynTila,
  nahtavillaoloMigroituTaiKuulutusaikaOhi,
  hyvaksymisPaatosVaiheAineistoKunnossa,
}: {
  kasittelynTila: KasittelynTila | undefined | null;
  nahtavillaoloMigroituTaiKuulutusaikaOhi: boolean;
  hyvaksymisPaatosVaiheAineistoKunnossa: boolean;
}): boolean {
  if (
    nahtavillaoloMigroituTaiKuulutusaikaOhi &&
    hyvaksymisPaatosVaiheAineistoKunnossa &&
    kasittelynTila?.hyvaksymispaatos?.asianumero &&
    kasittelynTila?.hyvaksymispaatos?.paatoksenPvm
  ) {
    return true;
  }
  return false;
}

function projektiOnVahintaanHyvaksymismenettelyssa({
  kasittelynTila,
  nahtavillaoloMigroituTaiKuulutusaikaOhi,
  hyvaksymisPaatosVaiheAineistoKunnossa,
}: {
  kasittelynTila: KasittelynTila | undefined | null;
  nahtavillaoloMigroituTaiKuulutusaikaOhi: boolean;
  hyvaksymisPaatosVaiheAineistoKunnossa: boolean;
}): boolean {
  if (
    nahtavillaoloMigroituTaiKuulutusaikaOhi &&
    hyvaksymisPaatosVaiheAineistoKunnossa &&
    !(kasittelynTila?.hyvaksymispaatos?.asianumero && kasittelynTila?.hyvaksymispaatos?.paatoksenPvm)
  ) {
    return true;
  }
  return false;
}

function projektinStatusOnVahintaanHyvaksymismenettelyssaAineistot({
  nahtavillaoloMigroituTaiKuulutusaikaOhi,
  hyvaksymisPaatosVaiheAineistoKunnossa,
}: {
  nahtavillaoloMigroituTaiKuulutusaikaOhi: boolean;
  hyvaksymisPaatosVaiheAineistoKunnossa: boolean;
}): boolean {
  if (nahtavillaoloMigroituTaiKuulutusaikaOhi && !hyvaksymisPaatosVaiheAineistoKunnossa) {
    return true;
  }
  return false;
}

function projektinStatusOnVahintaanNahtavillaolo({
  projekti,
}: {
  projekti: {
    nahtavillaoloVaiheJulkaisut?: Record<string, any>[] | null;
    nahtavillaoloVaihe?: Pick<NahtavillaoloVaihe, "aineistoNahtavilla"> | null;
  };
}): boolean {
  const nahtavillaoloVaiheAineistoKunnossa = aineistoNahtavillaIsOk(projekti.nahtavillaoloVaihe?.aineistoNahtavilla);
  if (projekti.nahtavillaoloVaiheJulkaisut?.length || nahtavillaoloVaiheAineistoKunnossa) {
    return true;
  }
  return false;
}

function projektinStatusOnVahintaanNahtavillaoloAineistot({
  projekti,
}: {
  projekti: {
    aloitusKuulutusJulkaisut?: Record<string, any>[] | null;
    vuorovaikutusKierros?: Pick<VuorovaikutusKierros, "tila"> | null;
    vahainenMenettely?: boolean | null;
  };
}): boolean {
  if (
    projekti.vuorovaikutusKierros?.tila == API.VuorovaikutusKierrosTila.MIGROITU ||
    projekti.vuorovaikutusKierros?.tila == API.VuorovaikutusKierrosTila.JULKINEN ||
    (projekti.vahainenMenettely && projekti.aloitusKuulutusJulkaisut?.length)
  ) {
    return true;
  }
  return false;
}

function projektinStatusOnVahintaanSuunnittelu({
  projekti,
}: {
  projekti: {
    aloitusKuulutusJulkaisut?: Record<string, any>[] | null;
    vahainenMenettely?: boolean | null;
  };
}): boolean {
  if (!!projekti.aloitusKuulutusJulkaisut?.length && !projekti.vahainenMenettely) {
    return true;
  }
  return false;
}
