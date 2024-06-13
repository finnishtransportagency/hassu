import { Aineisto, DBProjekti, HyvaksymisPaatosVaiheJulkaisu, NahtavillaoloVaiheJulkaisu } from "../../database/model";
import * as API from "hassu-common/graphql/apiModel";
import { DateAddTuple, isDateTimeInThePast } from "../../util/dateUtil";
import { kategorisoimattomatId } from "hassu-common/aineistoKategoriat";
import { GenericDbKuulutusJulkaisu, findJulkaisuWithTila } from "../projektiUtil";

export const HYVAKSYMISPAATOS_DURATION: DateAddTuple = [1, "year"];
export const JATKOPAATOS_DURATION: DateAddTuple = [6, "months"];

export default function getProjektiStatus(projekti: DBProjekti) {
  const kasittelynTila = projekti.kasittelynTila;

  const jatkoPaatos2Julkaisu = getJulkaisu(projekti.jatkoPaatos2VaiheJulkaisut);
  const jatkoPaatos2JulkaisunTila = jatkoPaatos2Julkaisu?.tila;
  const kuulutusJP2VaihePaattyyPaiva = jatkoPaatos2Julkaisu?.kuulutusVaihePaattyyPaiva;
  if (
    (jatkoPaatos2JulkaisunTila == API.KuulutusJulkaisuTila.HYVAKSYTTY &&
      isDateTimeInThePast(kuulutusJP2VaihePaattyyPaiva, "end-of-day", JATKOPAATOS_DURATION)) ||
    jatkoPaatos2JulkaisunTila == API.KuulutusJulkaisuTila.MIGROITU
  ) {
    // Jatkopäätös2-julkaisu on migroitu
    // tai se on hyväksytty ja kuulutus päättyy -päivä on mennyt riittävän kauan aikaa sitten
    return API.Status.EPAAKTIIVINEN_3;
  }

  if (kasittelynTila?.toinenJatkopaatos && kasittelynTila.toinenJatkopaatos.asianumero && kasittelynTila.toinenJatkopaatos.paatoksenPvm) {
    if (aineistoNahtavillaIsOk(jatkoPaatos2Julkaisu?.aineistoNahtavilla)) {
      // Käsittelyn tilaan on annettu toisen jatkopäätöksen asianumeroi ja päätöksenpvm
      // ja jatkopäätös2-julkaisun aineisto nähtävillä on ok
      return API.Status.JATKOPAATOS_2;
    } else {
      // Käsittelyn tilaan on annettu toisen jatkopäätöksen asianumeroi ja päätöksenpvm
      API.Status.JATKOPAATOS_2_AINEISTOT;
    }
  }

  const jatkoPaatos1Julkaisu = getJulkaisu(projekti.jatkoPaatos1VaiheJulkaisut);
  const jatkoPaatos1JulkaisunTila = jatkoPaatos1Julkaisu?.tila;
  const kuulutusJP1VaihePaattyyPaiva = jatkoPaatos1Julkaisu?.kuulutusVaihePaattyyPaiva;

  if (
    (jatkoPaatos1JulkaisunTila == API.KuulutusJulkaisuTila.HYVAKSYTTY &&
      isDateTimeInThePast(kuulutusJP1VaihePaattyyPaiva, "end-of-day", JATKOPAATOS_DURATION)) ||
    jatkoPaatos1JulkaisunTila == API.KuulutusJulkaisuTila.MIGROITU
  ) {
    // Jatkopäätös1-julkaisu on migroitu
    // tai se on hyväksytty ja kuulutus päättyy -päivä on mennyt riittävän kauan aikaa sitten
    return API.Status.EPAAKTIIVINEN_2;
  }

  if (
    kasittelynTila?.ensimmainenJatkopaatos &&
    kasittelynTila.ensimmainenJatkopaatos.asianumero &&
    kasittelynTila.ensimmainenJatkopaatos.paatoksenPvm
  ) {
    if (aineistoNahtavillaIsOk(jatkoPaatos1Julkaisu?.aineistoNahtavilla)) {
      // Käsittelyn tilaan on annettu toisen jatkopäätöksen asianumeroi ja päätöksenpvm
      // ja jatkopäätös2-julkaisun aineisto nähtävillä on ok
      return API.Status.JATKOPAATOS_2;
    } else {
      // Käsittelyn tilaan on annettu toisen jatkopäätöksen asianumeroi ja päätöksenpvm
      API.Status.JATKOPAATOS_2_AINEISTOT;
    }
  }

  const hyvaksymisPaatosJulkaisu = getJulkaisu(projekti.hyvaksymisPaatosVaiheJulkaisut);
  const hyvaksymisPaatosJulkaisunTila = hyvaksymisPaatosJulkaisu?.tila;
  const kuulutusVaihePaattyyPaiva = hyvaksymisPaatosJulkaisu?.kuulutusVaihePaattyyPaiva;

  if (
    (hyvaksymisPaatosJulkaisunTila == API.KuulutusJulkaisuTila.HYVAKSYTTY &&
      isDateTimeInThePast(kuulutusVaihePaattyyPaiva, "end-of-day", HYVAKSYMISPAATOS_DURATION)) ||
    hyvaksymisPaatosJulkaisunTila == API.KuulutusJulkaisuTila.MIGROITU
  ) {
    // Hyväksymispäätös-julkaisu on migroitu
    // tai se on hyväksytty ja kuulutus päättyy -päivä on mennyt riittävän kauan aikaa sitten
    return API.Status.EPAAKTIIVINEN_1;
  }

  const nahtavillaoloVaiheJulkaisu = getJulkaisu(projekti.nahtavillaoloVaiheJulkaisut);
  const nahtavillaoloJulkaisunTila = nahtavillaoloVaiheJulkaisu?.tila;
  const nahtavillaoloVaihePaattyyPaiva = nahtavillaoloVaiheJulkaisu?.kuulutusVaihePaattyyPaiva;

  if (
    (nahtavillaoloJulkaisunTila == API.KuulutusJulkaisuTila.HYVAKSYTTY &&
      isDateTimeInThePast(nahtavillaoloVaihePaattyyPaiva, "end-of-day")) ||
    nahtavillaoloJulkaisunTila == API.KuulutusJulkaisuTila.MIGROITU
  ) {
    const hasRequiredAineistot =
      aineistoNahtavillaIsOk(projekti.hyvaksymisPaatosVaihe?.aineistoNahtavilla) &&
      !!projekti.hyvaksymisPaatosVaihe?.hyvaksymisPaatos?.length;

    if (hasRequiredAineistot) {
      if (kasittelynTila?.hyvaksymispaatos?.asianumero && kasittelynTila?.hyvaksymispaatos?.paatoksenPvm) {
        // Hyväksymisvaiheessa on hyväksymispäätös ja aineisto nähtävillä kunnossa
        // ja käsittelyn tilassa hyväksymispäätöksellä asianumero ja päätöksenpvm
        return API.Status.HYVAKSYTTY;
      } else {
        // Hyväksymisvaiheessa on hyväksymispäätös ja aineisto nähtävillä kunnossa
        // mutta käsittelyn tilassa ei hyväksymispäätöksellä ole vielä sekä asianumeroa että päätöksenpvm:ää
        return API.Status.HYVAKSYMISMENETTELYSSA;
      }
    } else {
      // Nähtävilläolovaihejulkaisu on migroitu
      // tai hyväksytty ja kuulutus vaihe päättyy -päivä on menneisyydessä,
      // mutta hyväksymisesityksen aineisto nähtävillä tai hyväksymispäätös ei ole kunnossa
      return API.Status.HYVAKSYMISMENETTELYSSA_AINEISTOT;
    }
  }

  const vuorovaikutusKierros = projekti.vuorovaikutusKierros;
  const aloitusKuulutusJulkaisu = getJulkaisu(projekti.aloitusKuulutusJulkaisut);
  if (nahtavillaoloVaiheJulkaisu && aineistoNahtavillaIsOk(projekti.nahtavillaoloVaihe?.aineistoNahtavilla)) {
    return API.Status.NAHTAVILLAOLO;
  }
  if (
    vuorovaikutusKierros?.tila == API.VuorovaikutusKierrosTila.MIGROITU ||
    vuorovaikutusKierros?.tila === API.VuorovaikutusKierrosTila.JULKINEN ||
    (projekti.vahainenMenettely && aloitusKuulutusJulkaisu)
  ) {
    return API.Status.NAHTAVILLAOLO_AINEISTOT;
  }

  if (aloitusKuulutusJulkaisu && projekti.vahainenMenettely) {
    return API.Status.SUUNNITTELU;
  }

  return API.Status.EI_JULKAISTU;
}

function aineistoNahtavillaIsOk(aineistoNahtavilla?: Aineisto[] | null | undefined): boolean {
  // Check if aineistoNahtavilla
  // -- contains aineisto
  // -- does not contain aineisto with kategorisoimattomat category.
  return (
    !!aineistoNahtavilla?.length &&
    !aineistoNahtavilla.some((aineisto) => !aineisto.kategoriaId || aineisto.kategoriaId === kategorisoimattomatId)
  );
}

function getJulkaisu<A extends GenericDbKuulutusJulkaisu>(julkaisut: A[] | null | undefined): A | undefined {
  return (
    findJulkaisuWithTila(julkaisut, API.KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA) ??
    findJulkaisuWithTila(julkaisut, API.KuulutusJulkaisuTila.HYVAKSYTTY) ??
    findJulkaisuWithTila(julkaisut, API.KuulutusJulkaisuTila.PERUUTETTU) ??
    findJulkaisuWithTila(julkaisut, API.KuulutusJulkaisuTila.MIGROITU)
  );
}
