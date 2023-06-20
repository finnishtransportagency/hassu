import { DBProjekti, VuorovaikutusKierros as DBVuorovaikutusKierros } from "../../backend/src/database/model";
import { KuulutusJulkaisuTila, TilasiirtymaTyyppi, Projekti, MuokkausTila, VuorovaikutusKierros } from "../graphql/apiModel";

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

export function isAllowedToChangeVahainenMenettelyHelper({
  aloitusKuulutusMuokkausTila,
  vuorovaikutusKierros,
  nahtavillaoloVaiheMuokkausTila,
  hyvaksymisVaiheMuokkausTila,
  jatkoPaatos1VaiheMuokkausTila,
  jatkoPaatos2VaiheMuokkausTila,
}: {
  aloitusKuulutusMuokkausTila: MuokkausTila | undefined | null;
  vuorovaikutusKierros: VuorovaikutusKierros | DBVuorovaikutusKierros | undefined | null;
  nahtavillaoloVaiheMuokkausTila: MuokkausTila | undefined | null;
  hyvaksymisVaiheMuokkausTila: MuokkausTila | undefined | null;
  jatkoPaatos1VaiheMuokkausTila: MuokkausTila | undefined | null;
  jatkoPaatos2VaiheMuokkausTila: MuokkausTila | undefined | null;
}): boolean {
  if (!aloitusKuulutusMuokkausTila) {
    return true;
  }
  if (aloitusKuulutusMuokkausTila === MuokkausTila.LUKU) {
    return false;
  }
  if (aloitusKuulutusMuokkausTila === MuokkausTila.MUOKKAUS) {
    return true;
  }
  // aloitusKuulutusMuokkausTila === MuokkausTila.MIGROITU
  if (vuorovaikutusKierros) {
    return false;
  }
  // vuorovaikutusKierros == null || vuorovaikutusKierros == undefined
  if (!nahtavillaoloVaiheMuokkausTila) {
    return true;
  }
  if (nahtavillaoloVaiheMuokkausTila === MuokkausTila.MUOKKAUS) {
    return true;
  }
  if (nahtavillaoloVaiheMuokkausTila === MuokkausTila.LUKU) {
    return false;
  }
  if (!hyvaksymisVaiheMuokkausTila) {
    return true;
  }
  if (hyvaksymisVaiheMuokkausTila === MuokkausTila.MUOKKAUS) {
    return true;
  }
  if (hyvaksymisVaiheMuokkausTila === MuokkausTila.LUKU) {
    return false;
  }
  // hyvaksymisVaiheMuokkausTila === MuokkausTila.MIGROITU
  if (!jatkoPaatos1VaiheMuokkausTila) {
    return true;
  }
  if (jatkoPaatos1VaiheMuokkausTila === MuokkausTila.MUOKKAUS) {
    return true;
  }
  if (jatkoPaatos1VaiheMuokkausTila === MuokkausTila.LUKU) {
    return false;
  }
  // jatkoPaatos1VaiheMuokkausTila === MuokkausTila.MIGROITU
  if (!jatkoPaatos2VaiheMuokkausTila) {
    return true;
  }
  if (jatkoPaatos2VaiheMuokkausTila === MuokkausTila.MUOKKAUS) {
    return true;
  }
  if (jatkoPaatos2VaiheMuokkausTila === MuokkausTila.LUKU) {
    return false;
  }
  return false;
}

export function isAllowedToChangeVahainenMenettely(projekti: Projekti): boolean {
  return isAllowedToChangeVahainenMenettelyHelper({
    aloitusKuulutusMuokkausTila: projekti.aloitusKuulutus?.muokkausTila,
    vuorovaikutusKierros: projekti.vuorovaikutusKierros,
    nahtavillaoloVaiheMuokkausTila: projekti.nahtavillaoloVaihe?.muokkausTila,
    hyvaksymisVaiheMuokkausTila: projekti.hyvaksymisPaatosVaihe?.muokkausTila,
    jatkoPaatos1VaiheMuokkausTila: projekti.jatkoPaatos1Vaihe?.muokkausTila,
    jatkoPaatos2VaiheMuokkausTila: projekti.jatkoPaatos2Vaihe?.muokkausTila,
  });
}
