import { DBProjekti } from "../../backend/src/database/model";
import { KuulutusJulkaisuTila, MuokkausTila, Projekti, Status, TilasiirtymaTyyppi, VuorovaikutusKierrosTila } from "../graphql/apiModel";
import { statusOrder } from "../statusOrder";

export function isAllowedToMoveBack(tilasiirtymatyyppi: TilasiirtymaTyyppi, projekti: DBProjekti | Projekti): boolean {
  if (tilasiirtymatyyppi === TilasiirtymaTyyppi.NAHTAVILLAOLO) {
    return isAllowedToMoveBackToSuunnitteluvaihe(projekti);
  } else {
    return false; // Toistaiseksi ei mahdollista
  }
}

export function isAllowedToMoveBackToSuunnitteluvaihe(projekti: DBProjekti | Projekti): boolean {
  if (!projekti.vuorovaikutusKierros) {
    // Ei ole mitään mihin palata
    return false;
  }
  if (!((projekti as DBProjekti).nahtavillaoloVaiheJulkaisut || (projekti as Projekti).nahtavillaoloVaiheJulkaisu)) {
    // Nähtävilläolovaihetta ei ole vielä edes aloitettu. Ei ole järkeä palata suunnitteluun.
    return false;
  }
  const hyvaksyntaaOdottava =
    (projekti as DBProjekti).nahtavillaoloVaiheJulkaisut?.some((julkaisu) => julkaisu.tila == KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA) ||
    (projekti as Projekti).nahtavillaoloVaiheJulkaisu?.tila == KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA;
  if (hyvaksyntaaOdottava) {
    // Nähtävilläolovaihe odottaa hyväksyntää. Se on hylättävä ennen kuin on mahdollista palata suunnitteluun.
    return false;
  }
  if (projekti.nahtavillaoloVaihe?.uudelleenKuulutus) {
    // Uudelleenkuulutus on avattu nähtävilläoloon, mutta sitä ei ole julkaistu. Ei ole mahdollista palata suunnitteluun.
    return false;
  }
  if ((projekti as DBProjekti).hyvaksymisPaatosVaiheJulkaisut || (projekti as Projekti).hyvaksymisPaatosVaiheJulkaisu) {
    // Ollaan edetty jo hyväksymispäätösvaiheeseen. Ei ole mahdollista palata enää suunnitteluun.
    return false;
  }
  // Nähtävilläolovaihe on aloitettu, yhtään kuulutusta ei ole odottamassa hyväksyntää,
  // eikä uudelleenkuulutusta ole avattu, mutta jätetty julkaisematta.
  // On mahdollista siirtyä nähtävilläolovaiheesta suunnitteluun.
  return true;
}

type JulkaisuStatus =
  | Status.ALOITUSKUULUTUS
  | Status.SUUNNITTELU
  | Status.NAHTAVILLAOLO
  | Status.HYVAKSYTTY
  | Status.JATKOPAATOS_1
  | Status.JATKOPAATOS_2;

type JulkaisuAvain = keyof Pick<
  Projekti,
  | "aloitusKuulutusJulkaisu"
  | "vuorovaikutusKierrosJulkaisut"
  | "nahtavillaoloVaiheJulkaisu"
  | "hyvaksymisPaatosVaiheJulkaisu"
  | "jatkoPaatos1VaiheJulkaisu"
  | "jatkoPaatos2VaiheJulkaisu"
>;

type VaiheAvain = keyof Pick<
  Projekti,
  "aloitusKuulutus" | "vuorovaikutusKierros" | "nahtavillaoloVaihe" | "hyvaksymisPaatosVaihe" | "jatkoPaatos1Vaihe" | "jatkoPaatos2Vaihe"
>;

type Julkaisu = Projekti[JulkaisuAvain];
type Vaihe = Projekti[VaiheAvain];

type TilakohtaisetVaiheet = Record<JulkaisuStatus, { julkaisu: Julkaisu; vaihe: Vaihe }>;

function isJulkaisuUserCreated(julkaisu: Julkaisu): julkaisu is NonNullable<Julkaisu> {
  return Array.isArray(julkaisu)
    ? julkaisu.some((kierrosJulkaisu) => !!kierrosJulkaisu?.tila && kierrosJulkaisu.tila !== VuorovaikutusKierrosTila.MIGROITU)
    : !!julkaisu && julkaisu.tila !== KuulutusJulkaisuTila.MIGROITU;
}

const isVaiheMuokkaustilassa = (vaihe: Vaihe) =>
  !vaihe ||
  (vaihe.__typename === "VuorovaikutusKierros"
    ? vaihe.tila === VuorovaikutusKierrosTila.MUOKATTAVISSA
    : vaihe.muokkausTila === MuokkausTila.MUOKKAUS);

type AdditionalValidation = (tila: JulkaisuStatus, julkaisu: Julkaisu, vaihe: Vaihe) => boolean;

function noUserCreatedJulkaisuPreventingChange(projekti: Projekti, additionalVaiheChecks?: AdditionalValidation): boolean {
  const tilakohtaisetVaiheet: TilakohtaisetVaiheet = {
    ALOITUSKUULUTUS: { julkaisu: projekti.aloitusKuulutusJulkaisu, vaihe: projekti.aloitusKuulutus },
    SUUNNITTELU: { julkaisu: projekti.vuorovaikutusKierrosJulkaisut, vaihe: projekti.vuorovaikutusKierros },
    NAHTAVILLAOLO: { julkaisu: projekti.nahtavillaoloVaiheJulkaisu, vaihe: projekti.nahtavillaoloVaihe },
    HYVAKSYTTY: { julkaisu: projekti.hyvaksymisPaatosVaiheJulkaisu, vaihe: projekti.hyvaksymisPaatosVaihe },
    JATKOPAATOS_1: { julkaisu: projekti.jatkoPaatos1VaiheJulkaisu, vaihe: projekti.jatkoPaatos1Vaihe },
    JATKOPAATOS_2: { julkaisu: projekti.jatkoPaatos2VaiheJulkaisu, vaihe: projekti.jatkoPaatos2Vaihe },
  };

  const noJulkaisuPreventingChange = !Object.entries(tilakohtaisetVaiheet)
    // Jos julkaisua ei ole tai se on migratoitu, vaihe on OK
    .filter(([_, { julkaisu }]) => isJulkaisuUserCreated(julkaisu))
    // Tarkastetaan salliiko vaiheen ja julkaisun tiedot
    .some(([tilaString, { julkaisu, vaihe }]) => {
      const tila = tilaString as JulkaisuStatus;
      const statusNro = statusOrder[tila];

      // Haetaan julkaisut, jotka on järjestyksessä ennen kyseistä vaihetta
      const aiemmatJulkaisut = Object.entries(tilakohtaisetVaiheet)
        .filter(([t]) => statusOrder[t as JulkaisuStatus] < statusNro)
        .map(([_, { julkaisu: j }]) => j);

      const vaiheNotEditable = !isVaiheMuokkaustilassa(vaihe);
      const hasPriorUserCreatedJulkaisu = aiemmatJulkaisut.some(isJulkaisuUserCreated);
      const doesntPassAdditionalChecks = additionalVaiheChecks ? !additionalVaiheChecks(tila, julkaisu, vaihe) : false;

      // Jos vaihe ei ole muokattavissa
      // TAI sitä edeltävissä vaiheissa on käyttäjän luomia julkaisuja
      // TAI se ei läpäise lisäehtoja
      return vaiheNotEditable || hasPriorUserCreatedJulkaisu || doesntPassAdditionalChecks;
    });

  return noJulkaisuPreventingChange;
}

export function isAllowedToChangeVahainenMenettely(projekti: Projekti): boolean {
  return noUserCreatedJulkaisuPreventingChange(projekti);
}

export function isAllowedToChangeSuunnittelusopimus(projekti: Projekti): boolean {
  return noUserCreatedJulkaisuPreventingChange(projekti);
}

export function isAllowedToChangeKielivalinta(projekti: Projekti): boolean {
  // Jos tila on jotain muuta kuin ALOITUSKUULUTUS, tarkistetaan, että vaiheella ei ole uudelleenkuulutusta
  const preventNonAloituskuulutusUudelleenkuulutus: AdditionalValidation = (tila, _julkaisu, vaihe) => {
    return tila === Status.ALOITUSKUULUTUS || (vaihe?.__typename === "VuorovaikutusKierros" ? true : !vaihe?.uudelleenKuulutus);
  };
  return noUserCreatedJulkaisuPreventingChange(projekti, preventNonAloituskuulutusUudelleenkuulutus);
}

export function isAllowedToChangeEuRahoitus(projekti: Projekti): boolean {
  return noUserCreatedJulkaisuPreventingChange(projekti);
}
