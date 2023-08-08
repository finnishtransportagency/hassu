import { DBProjekti } from "../../backend/src/database/model";
import { KuulutusJulkaisuTila, TilasiirtymaTyyppi, Projekti } from "../graphql/apiModel";

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
