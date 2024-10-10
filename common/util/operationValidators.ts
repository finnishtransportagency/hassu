import { DBProjekti } from "../../backend/src/database/model";
import { KuulutusJulkaisuTila, Projekti, TilasiirtymaTyyppi, Vaihe, VuorovaikutusKierrosTila } from "../graphql/apiModel";
import { statusOrder } from "../statusOrder";
import {
  haeKaikkienVaiheidenTiedot,
  JulkaisuData,
  julkaisuIsVuorovaikutusKierrosLista,
  VaiheData,
  vaiheOnMuokkausTilassa,
  vaiheToStatus,
} from "./haeVaiheidentiedot";

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
  if (projekti.nahtavillaoloVaihe?.aineistoMuokkaus) {
    // Nähtävilläolossa on aineistomuokkaus käynnissä. Se on hylättävä tai vietävä hyväksyttäväksi.
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

function isJulkaisuUserCreated(julkaisu: JulkaisuData): julkaisu is NonNullable<JulkaisuData> {
  return julkaisuIsVuorovaikutusKierrosLista(julkaisu)
    ? julkaisu.some((kierrosJulkaisu) => !!kierrosJulkaisu?.tila && kierrosJulkaisu.tila !== VuorovaikutusKierrosTila.MIGROITU)
    : !!julkaisu && julkaisu.tila !== KuulutusJulkaisuTila.MIGROITU;
}

type AdditionalValidation = (vaiheTyyppi: Vaihe, julkaisu: JulkaisuData, vaihe: VaiheData) => boolean;

function noUserCreatedJulkaisuPreventingChange(projekti: Projekti, additionalVaiheChecks?: AdditionalValidation): boolean {
  const vaiheidenTiedot = haeKaikkienVaiheidenTiedot(projekti);

  const noJulkaisuPreventingChange = !Object.entries(vaiheidenTiedot)
    // Jos julkaisua ei ole tai se on migratoitu, vaihe on OK
    .filter(([_, { julkaisu }]) => isJulkaisuUserCreated(julkaisu))
    // Tarkastetaan salliiko vaiheen ja julkaisun tiedot
    .some(([vaiheString, { julkaisu, vaihe }]) => {
      const vaiheTyyppi = vaiheString as Vaihe;
      const statusNro = statusOrder(vaiheToStatus[vaiheTyyppi]);

      // Haetaan julkaisut, jotka on järjestyksessä ennen kyseistä vaihetta
      const aiemmatJulkaisut = Object.entries(vaiheidenTiedot)
        .filter(([t]) => statusOrder(vaiheToStatus[t as Vaihe]) < statusNro)
        .map(([_, { julkaisu: j }]) => j);

      const vaiheNotEditable = !vaiheOnMuokkausTilassa(projekti, vaiheTyyppi);
      const hasPriorUserCreatedJulkaisu = aiemmatJulkaisut.some(isJulkaisuUserCreated);
      const doesntPassAdditionalChecks = additionalVaiheChecks ? !additionalVaiheChecks(vaiheTyyppi, julkaisu, vaihe) : false;

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
  const preventNonAloituskuulutusUudelleenkuulutus: AdditionalValidation = (vaiheTyyppi, _julkaisu, vaihe) => {
    return vaiheTyyppi === Vaihe.ALOITUSKUULUTUS || (vaihe?.__typename === "VuorovaikutusKierros" ? true : !vaihe?.uudelleenKuulutus);
  };
  return noUserCreatedJulkaisuPreventingChange(projekti, preventNonAloituskuulutusUudelleenkuulutus);
}

export function isAllowedToChangeEuRahoitus(projekti: Projekti): boolean {
  return noUserCreatedJulkaisuPreventingChange(projekti);
}
