import {
  Aineisto,
  AloitusKuulutusJulkaisu,
  DBProjekti,
  HyvaksymisPaatosVaihe,
  HyvaksymisPaatosVaiheJulkaisu,
  KasittelynTila,
  NahtavillaoloVaiheJulkaisu,
  Velho,
  VuorovaikutusKierros,
} from "../../database/model";
import * as API from "hassu-common/graphql/apiModel";
import { DateAddTuple, isDateTimeInThePast } from "../../util/dateUtil";
import { getAineistoKategoriat, kategorisoimattomatId } from "hassu-common/aineistoKategoriat";
import { GenericDbKuulutusJulkaisu, findJulkaisuWithTila, adaptMuokkausTila } from "../projektiUtil";
import { kayttoOikeudetSchema } from "../../../../src/schemas/kayttoOikeudet";
import { perustiedotValidationSchema } from "../../../../src/schemas/perustiedot";
import { ValidationError } from "yup";
import { adaptAsianhallinta } from "../adapter/adaptAsianhallinta";
import { adaptDBVaylaUsertoAPIProjektiKayttaja } from "../adapter/adaptToAPI";
import { log } from "../../logger";

export const HYVAKSYMISPAATOS_DURATION: DateAddTuple = [1, "year"];
export const JATKOPAATOS_DURATION: DateAddTuple = [6, "months"];

type JulkaisunTarpeellisetTiedot = Pick<
  NahtavillaoloVaiheJulkaisu,
  "id" | "tila" | "kuulutusPaiva" | "kuulutusVaihePaattyyPaiva" | "aineistoNahtavilla" | "yhteystiedot" | "kuulutusYhteystiedot"
>;

type NahtavillaoloVaiheenTarpeellisetTiedot = Pick<HyvaksymisPaatosVaihe, "aineistoNahtavilla" | "id">;
type HyvaksymisVaiheenTarpeellisetTiedot = Pick<HyvaksymisPaatosVaihe, "aineistoNahtavilla" | "hyvaksymisPaatos" | "id">;
type ProjektiForGetStatus = Pick<DBProjekti, "kielitiedot" | "euRahoitus" | "kayttoOikeudet" | "vahainenMenettely" | "kasittelynTila"> & {
  velho?: Pick<Velho, "suunnittelustaVastaavaViranomainen" | "nimi" | "asiatunnusELY" | "asiatunnusVayla" | "tyyppi"> | null;
  aloitusKuulutusJulkaisut?: Pick<AloitusKuulutusJulkaisu, "tila" | "kuulutusPaiva">[] | null;
  vuorovaikutusKierros?: Pick<VuorovaikutusKierros, "tila"> | null;
  nahtavillaoloVaihe?: NahtavillaoloVaiheenTarpeellisetTiedot | null;
  nahtavillaoloVaiheJulkaisut?: JulkaisunTarpeellisetTiedot[] | null;
  hyvaksymisPaatosVaihe?: HyvaksymisVaiheenTarpeellisetTiedot | null;
  hyvaksymisPaatosVaiheJulkaisut?: JulkaisunTarpeellisetTiedot[] | null;
  jatkoPaatos1Vaihe?: HyvaksymisVaiheenTarpeellisetTiedot | null;
  jatkoPaatos1VaiheJulkaisut?: JulkaisunTarpeellisetTiedot[] | null;
  jatkoPaatos2Vaihe?: HyvaksymisVaiheenTarpeellisetTiedot | null;
  jatkoPaatos2VaiheJulkaisut?: JulkaisunTarpeellisetTiedot[] | null;
};

export default class GetProjektiStatus {
  static async getProjektiStatus(projekti: ProjektiForGetStatus) {
    return await getProjektiStatus(projekti);
  }
}

async function getProjektiStatus(projekti: ProjektiForGetStatus) {
  if (projektiHenkiloissaOnOngelma(projekti)) {
    return API.Status.EI_JULKAISTU_PROJEKTIN_HENKILOT;
  }

  if (await projektinPerustiedoissaOnOngelma(projekti)) {
    return API.Status.EI_JULKAISTU;
  }

  const jatkoPaatos2Julkaisu = getJulkaisu(projekti.jatkoPaatos2VaiheJulkaisut);

  if (projektiOnEpaAktiivinen3(jatkoPaatos2Julkaisu)) {
    return API.Status.EPAAKTIIVINEN_3;
  }
  const jatkoPaatos2Vaihe = projekti.jatkoPaatos2Vaihe;

  const aineistoKategoriat = getAineistoKategoriat({ projektiTyyppi: projekti.velho?.tyyppi, hideDeprecated: true }).listKategoriaIds();

  const jatkoPaatos2VaiheAineistoKunnossa =
    aineistoNahtavillaIsOk(jatkoPaatos2Vaihe?.aineistoNahtavilla, aineistoKategoriat) && !!jatkoPaatos2Vaihe?.hyvaksymisPaatos?.length;

  const jatkoPaatos2MuokkausTila = jatkoPaatos2Vaihe
    ? adaptMuokkausTila(jatkoPaatos2Vaihe, projekti.jatkoPaatos2VaiheJulkaisut)
    : API.MuokkausTila.MUOKKAUS;

  const kasittelynTila = projekti.kasittelynTila;

  if (projektinStatusOnVahintaanJatkoPaatos2({ kasittelynTila, jatkoPaatos2VaiheAineistoKunnossa, jatkoPaatos2MuokkausTila })) {
    return API.Status.JATKOPAATOS_2;
  }

  if (projektinStatusOnVahintaanJatkoPaatos2Aineistot({ kasittelynTila, jatkoPaatos2VaiheAineistoKunnossa })) {
    return API.Status.JATKOPAATOS_2_AINEISTOT;
  }

  const jatkoPaatos1Julkaisu = getJulkaisu(projekti.jatkoPaatos1VaiheJulkaisut);

  if (projektiOnVahintaanEpaAktiivinen2(jatkoPaatos1Julkaisu)) {
    return API.Status.EPAAKTIIVINEN_2;
  }

  const jatkoPaatos1Vaihe = projekti.jatkoPaatos1Vaihe;

  const jatkoPaatos1VaiheAineistoKunnossa =
    aineistoNahtavillaIsOk(jatkoPaatos1Vaihe?.aineistoNahtavilla, aineistoKategoriat) && !!jatkoPaatos1Vaihe?.hyvaksymisPaatos?.length;

  const jatkoPaatos1MuokkausTila = jatkoPaatos1Vaihe
    ? adaptMuokkausTila(jatkoPaatos1Vaihe, projekti.jatkoPaatos1VaiheJulkaisut)
    : API.MuokkausTila.MUOKKAUS;

  if (projektinStatusOnVahintaanJatkoPaatos1({ kasittelynTila, jatkoPaatos1VaiheAineistoKunnossa, jatkoPaatos1MuokkausTila })) {
    return API.Status.JATKOPAATOS_1;
  }

  if (projektinStatusOnVahintaanJatkoPaatos1Aineistot({ kasittelynTila, jatkoPaatos1VaiheAineistoKunnossa })) {
    return API.Status.JATKOPAATOS_1_AINEISTOT;
  }

  if (projektinStatusOnVahintaanEpaAktiivinen1(projekti)) {
    return API.Status.EPAAKTIIVINEN_1;
  }

  const nahtavillaoloVaiheJulkaisu = getJulkaisu(projekti.nahtavillaoloVaiheJulkaisut);
  const nahtavillaoloJulkaisunTila = nahtavillaoloVaiheJulkaisu?.tila;
  const nahtavillaoloVaihePaattyyPaiva = nahtavillaoloVaiheJulkaisu?.kuulutusVaihePaattyyPaiva;
  const nahtavillaoloMigroituTaiKuulutusaikaOhi =
    (nahtavillaoloJulkaisunTila === API.KuulutusJulkaisuTila.HYVAKSYTTY &&
      isDateTimeInThePast(nahtavillaoloVaihePaattyyPaiva, "end-of-day")) ||
    nahtavillaoloJulkaisunTila === API.KuulutusJulkaisuTila.MIGROITU;
  const hyvaksymisPaatosVaiheAineistoKunnossa =
    aineistoNahtavillaIsOk(projekti.hyvaksymisPaatosVaihe?.aineistoNahtavilla, aineistoKategoriat) &&
    !!projekti.hyvaksymisPaatosVaihe?.hyvaksymisPaatos?.length;

  const hyvaksymisPaatosVaiheMuokkausTila = projekti.hyvaksymisPaatosVaihe
    ? adaptMuokkausTila(projekti.hyvaksymisPaatosVaihe, projekti.hyvaksymisPaatosVaiheJulkaisut)
    : API.MuokkausTila.MUOKKAUS;

  if (
    projektinStatusOnVahintaanHyvaksytty({
      kasittelynTila,
      nahtavillaoloMigroituTaiKuulutusaikaOhi,
      hyvaksymisPaatosVaiheAineistoKunnossa,
      hyvaksymisPaatosVaiheMuokkausTila,
    })
  ) {
    return API.Status.HYVAKSYTTY;
  }

  if (
    projektiOnVahintaanHyvaksymismenettelyssa({
      kasittelynTila,
      nahtavillaoloMigroituTaiKuulutusaikaOhi,
      hyvaksymisPaatosVaiheAineistoKunnossa,
      hyvaksymisPaatosVaiheMuokkausTila,
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

  const nahtavillaoloMuokkausTila = projekti.nahtavillaoloVaihe
    ? adaptMuokkausTila(projekti.nahtavillaoloVaihe, projekti.nahtavillaoloVaiheJulkaisut)
    : API.MuokkausTila.MUOKKAUS;

  if (
    projektinStatusOnVahintaanNahtavillaolo({
      nahtavillaoloVaihe: projekti.nahtavillaoloVaihe,
      nahtavillaoloMuokkausTila,
      aineistoKategoriat,
    })
  ) {
    return API.Status.NAHTAVILLAOLO;
  }

  if (projektinStatusOnVahintaanNahtavillaoloAineistot(projekti)) {
    return API.Status.NAHTAVILLAOLO_AINEISTOT;
  }

  if (projektinStatusOnVahintaanSuunnittelu(projekti)) {
    return API.Status.SUUNNITTELU;
  }

  return API.Status.ALOITUSKUULUTUS;
}

function aineistoNahtavillaIsOk(aineistoNahtavilla: Aineisto[] | null | undefined, aineistoKategoriat: string[]): boolean {
  return (
    !!aineistoNahtavilla?.length &&
    !aineistoNahtavilla.some(
      (aineisto) =>
        !aineisto.kategoriaId || aineisto.kategoriaId === kategorisoimattomatId || !aineistoKategoriat.includes(aineisto.kategoriaId)
    )
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
      log.info("Projektin perustiedot virheelliset", { error: e.message });
      return true;
    } else {
      throw e;
    }
  }
  return false;
}

function projektiOnEpaAktiivinen3(
  jatkoPaatos2Julkaisu: Pick<HyvaksymisPaatosVaiheJulkaisu, "tila" | "kuulutusVaihePaattyyPaiva"> | undefined
): boolean {
  const jatkoPaatos2JulkaisunTila = jatkoPaatos2Julkaisu?.tila;
  const kuulutusJP2VaihePaattyyPaiva = jatkoPaatos2Julkaisu?.kuulutusVaihePaattyyPaiva;
  if (
    (jatkoPaatos2JulkaisunTila === API.KuulutusJulkaisuTila.HYVAKSYTTY &&
      isDateTimeInThePast(kuulutusJP2VaihePaattyyPaiva, "end-of-day", JATKOPAATOS_DURATION)) ||
    jatkoPaatos2JulkaisunTila === API.KuulutusJulkaisuTila.MIGROITU
  ) {
    return true;
  }
  return false;
}

function projektinStatusOnVahintaanJatkoPaatos2({
  kasittelynTila,
  jatkoPaatos2VaiheAineistoKunnossa,
  jatkoPaatos2MuokkausTila,
}: {
  kasittelynTila: KasittelynTila | undefined | null;
  jatkoPaatos2VaiheAineistoKunnossa: boolean;
  jatkoPaatos2MuokkausTila: API.MuokkausTila;
}): boolean {
  if (
    kasittelynTila?.toinenJatkopaatos?.asianumero &&
    kasittelynTila?.toinenJatkopaatos?.paatoksenPvm &&
    (jatkoPaatos2MuokkausTila !== API.MuokkausTila.MUOKKAUS || jatkoPaatos2VaiheAineistoKunnossa)
  ) {
    return true;
  }
  return false;
}

function projektinStatusOnVahintaanJatkoPaatos2Aineistot({
  kasittelynTila,
  jatkoPaatos2VaiheAineistoKunnossa,
}: {
  kasittelynTila: KasittelynTila | undefined | null;
  jatkoPaatos2VaiheAineistoKunnossa: boolean;
}): boolean {
  if (
    kasittelynTila?.toinenJatkopaatos?.asianumero &&
    kasittelynTila?.toinenJatkopaatos?.paatoksenPvm &&
    !jatkoPaatos2VaiheAineistoKunnossa
  ) {
    return true;
  }
  return false;
}

function projektiOnVahintaanEpaAktiivinen2(
  jatkoPaatos1Julkaisu: Pick<HyvaksymisPaatosVaiheJulkaisu, "tila" | "kuulutusVaihePaattyyPaiva"> | undefined
): boolean {
  const jatkoPaatos1JulkaisunTila = jatkoPaatos1Julkaisu?.tila;
  const kuulutusJP1VaihePaattyyPaiva = jatkoPaatos1Julkaisu?.kuulutusVaihePaattyyPaiva;

  if (
    (jatkoPaatos1JulkaisunTila === API.KuulutusJulkaisuTila.HYVAKSYTTY &&
      isDateTimeInThePast(kuulutusJP1VaihePaattyyPaiva, "end-of-day", JATKOPAATOS_DURATION)) ||
    jatkoPaatos1JulkaisunTila === API.KuulutusJulkaisuTila.MIGROITU
  ) {
    return true;
  }
  return false;
}

function projektinStatusOnVahintaanJatkoPaatos1({
  kasittelynTila,
  jatkoPaatos1VaiheAineistoKunnossa,
  jatkoPaatos1MuokkausTila,
}: {
  kasittelynTila: KasittelynTila | undefined | null;
  jatkoPaatos1VaiheAineistoKunnossa: boolean;
  jatkoPaatos1MuokkausTila: API.MuokkausTila;
}): boolean {
  if (
    kasittelynTila?.ensimmainenJatkopaatos?.asianumero &&
    kasittelynTila?.ensimmainenJatkopaatos?.paatoksenPvm &&
    (jatkoPaatos1MuokkausTila !== API.MuokkausTila.MUOKKAUS || jatkoPaatos1VaiheAineistoKunnossa)
  ) {
    return true;
  }
  return false;
}

function projektinStatusOnVahintaanJatkoPaatos1Aineistot({
  kasittelynTila,
  jatkoPaatos1VaiheAineistoKunnossa,
}: {
  kasittelynTila: KasittelynTila | undefined | null;
  jatkoPaatos1VaiheAineistoKunnossa: boolean;
}): boolean {
  if (
    kasittelynTila?.ensimmainenJatkopaatos?.asianumero &&
    kasittelynTila?.ensimmainenJatkopaatos?.paatoksenPvm &&
    !jatkoPaatos1VaiheAineistoKunnossa
  ) {
    return true;
  }
  return false;
}

function projektinStatusOnVahintaanEpaAktiivinen1(projekti: {
  hyvaksymisPaatosVaiheJulkaisut?: Pick<HyvaksymisPaatosVaiheJulkaisu, "tila" | "kuulutusVaihePaattyyPaiva">[] | null;
}): boolean {
  const hyvaksymisPaatosJulkaisu = getJulkaisu(projekti.hyvaksymisPaatosVaiheJulkaisut);
  const hyvaksymisPaatosJulkaisunTila = hyvaksymisPaatosJulkaisu?.tila;
  const kuulutusVaihePaattyyPaiva = hyvaksymisPaatosJulkaisu?.kuulutusVaihePaattyyPaiva;

  if (
    (hyvaksymisPaatosJulkaisunTila === API.KuulutusJulkaisuTila.HYVAKSYTTY &&
      isDateTimeInThePast(kuulutusVaihePaattyyPaiva, "end-of-day", HYVAKSYMISPAATOS_DURATION)) ||
    hyvaksymisPaatosJulkaisunTila === API.KuulutusJulkaisuTila.MIGROITU
  ) {
    return true;
  }
  return false;
}

function projektinStatusOnVahintaanHyvaksytty({
  kasittelynTila,
  nahtavillaoloMigroituTaiKuulutusaikaOhi,
  hyvaksymisPaatosVaiheAineistoKunnossa,
  hyvaksymisPaatosVaiheMuokkausTila,
}: {
  kasittelynTila: KasittelynTila | undefined | null;
  nahtavillaoloMigroituTaiKuulutusaikaOhi: boolean;
  hyvaksymisPaatosVaiheAineistoKunnossa: boolean;
  hyvaksymisPaatosVaiheMuokkausTila: API.MuokkausTila;
}): boolean {
  if (
    nahtavillaoloMigroituTaiKuulutusaikaOhi &&
    kasittelynTila?.hyvaksymispaatos?.asianumero &&
    kasittelynTila?.hyvaksymispaatos?.paatoksenPvm &&
    (hyvaksymisPaatosVaiheMuokkausTila !== API.MuokkausTila.MUOKKAUS || hyvaksymisPaatosVaiheAineistoKunnossa)
  ) {
    return true;
  }
  return false;
}

function projektiOnVahintaanHyvaksymismenettelyssa({
  kasittelynTila,
  nahtavillaoloMigroituTaiKuulutusaikaOhi,
  hyvaksymisPaatosVaiheAineistoKunnossa,
  hyvaksymisPaatosVaiheMuokkausTila,
}: {
  kasittelynTila: KasittelynTila | undefined | null;
  nahtavillaoloMigroituTaiKuulutusaikaOhi: boolean;
  hyvaksymisPaatosVaiheAineistoKunnossa: boolean;
  hyvaksymisPaatosVaiheMuokkausTila: API.MuokkausTila;
}): boolean {
  if (
    nahtavillaoloMigroituTaiKuulutusaikaOhi &&
    (hyvaksymisPaatosVaiheMuokkausTila !== API.MuokkausTila.MUOKKAUS || hyvaksymisPaatosVaiheAineistoKunnossa) &&
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
  nahtavillaoloVaihe,
  aineistoKategoriat,
  nahtavillaoloMuokkausTila,
}: {
  nahtavillaoloVaihe: NahtavillaoloVaiheenTarpeellisetTiedot | null | undefined;
  aineistoKategoriat: string[];
  nahtavillaoloMuokkausTila: API.MuokkausTila;
}): boolean {
  const nahtavillaoloVaiheAineistoKunnossa = aineistoNahtavillaIsOk(nahtavillaoloVaihe?.aineistoNahtavilla, aineistoKategoriat);

  if (nahtavillaoloMuokkausTila !== API.MuokkausTila.MUOKKAUS || nahtavillaoloVaiheAineistoKunnossa) {
    return true;
  }

  return false;
}

function projektinStatusOnVahintaanNahtavillaoloAineistot(projekti: {
  aloitusKuulutusJulkaisut?: Record<string, unknown>[] | null;
  vuorovaikutusKierros?: Pick<VuorovaikutusKierros, "tila"> | null;
  vahainenMenettely?: boolean | null;
}): boolean {
  if (
    projekti.vuorovaikutusKierros?.tila === API.VuorovaikutusKierrosTila.MIGROITU ||
    projekti.vuorovaikutusKierros?.tila === API.VuorovaikutusKierrosTila.JULKINEN ||
    (projekti.vahainenMenettely && projekti.aloitusKuulutusJulkaisut?.length)
  ) {
    return true;
  }
  return false;
}

function projektinStatusOnVahintaanSuunnittelu(projekti: {
  aloitusKuulutusJulkaisut?: Record<string, unknown>[] | null;
  vahainenMenettely?: boolean | null;
}): boolean {
  if (!!projekti.aloitusKuulutusJulkaisut?.length && !projekti.vahainenMenettely) {
    return true;
  }
  return false;
}
