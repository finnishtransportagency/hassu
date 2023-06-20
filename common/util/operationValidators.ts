import { DBProjekti } from "../../backend/src/database/model";
import { KuulutusJulkaisuTila, TilasiirtymaTyyppi, Projekti, AloitusKuulutus, MuokkausTila } from "../graphql/apiModel";

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

export function isAllowedToChangeVahainenMenettely(projekti: Projekti): boolean {
  const aloitusKuulutus: AloitusKuulutus | null | undefined = projekti.aloitusKuulutus;
  if (!aloitusKuulutus) {
    return true;
  }
  if (aloitusKuulutus.muokkausTila === MuokkausTila.LUKU) {
    return false;
  }
  if (aloitusKuulutus.muokkausTila === MuokkausTila.MUOKKAUS) {
    return true;
  }
  // aloituskuulutus.muokkausTila === MuokkausTila.MIGROITU
  const suunnittelu = projekti.vuorovaikutusKierros;
  if (suunnittelu) {
    return false;
  }
  // suunnittelu == null || suunnittelu == undefined
  const nahtavillaolo = projekti.nahtavillaoloVaihe;
  if (!nahtavillaolo) {
    return true;
  }
  if (nahtavillaolo.muokkausTila === MuokkausTila.MUOKKAUS) {
    return true;
  }
  if (nahtavillaolo.muokkausTila === MuokkausTila.LUKU) {
    return false;
  }
  const hyvaksymisVaihe = projekti.hyvaksymisPaatosVaihe;
  if (!hyvaksymisVaihe) {
    return true;
  }
  if (hyvaksymisVaihe.muokkausTila === MuokkausTila.MUOKKAUS) {
    return true;
  }
  if (hyvaksymisVaihe.muokkausTila === MuokkausTila.LUKU) {
    return false;
  }
  // hyvaksymisVaihe.muokkausTila === MuokkausTila.MIGROITU
  const jatkopaatos = projekti.jatkoPaatos1Vaihe;
  if (!jatkopaatos) {
    return true;
  }
  if (jatkopaatos.muokkausTila === MuokkausTila.MUOKKAUS) {
    return true;
  }
  if (jatkopaatos.muokkausTila === MuokkausTila.LUKU) {
    return false;
  }
  // jatkopaatos.muokkausTila === MuokkausTila.MIGROITU
  const jatkopaatos2 = projekti.jatkoPaatos2Vaihe;
  if (!jatkopaatos2) {
    return true;
  }
  if (jatkopaatos2.muokkausTila === MuokkausTila.MUOKKAUS) {
    return true;
  }
  if (jatkopaatos2.muokkausTila === MuokkausTila.LUKU) {
    return false;
  }
  return false;
}
