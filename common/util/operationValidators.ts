import { HyvaksymisPaatosVaiheJulkaisu, KuulutusJulkaisuTila, NahtavillaoloVaihe, NahtavillaoloVaiheJulkaisu } from "../graphql/apiModel";

export function isAllowedToMoveBackToSuunnitteluvaihe({
  nahtavillaoloVaihe,
  nahtavillaoloVaiheJulkaisut,
  hyvaksymisPaatosVaiheJulkaisut,
}: {
  nahtavillaoloVaihe: Pick<NahtavillaoloVaihe, "uudelleenKuulutus"> | null | undefined;
  nahtavillaoloVaiheJulkaisut: Pick<NahtavillaoloVaiheJulkaisu, "tila" | "uudelleenKuulutus">[] | null | undefined;
  hyvaksymisPaatosVaiheJulkaisut: Pick<HyvaksymisPaatosVaiheJulkaisu, "tila">[] | null | undefined;
}): boolean {
  if (!nahtavillaoloVaiheJulkaisut) {
    // Nähtävilläolovaihetta ei ole vielä edes aloitettu. Ei ole järkeä palata suunnitteluun.
    return false;
  }
  const hyvaksyntaaOdottava = nahtavillaoloVaiheJulkaisut
    ?.filter((julkaisu) => julkaisu.tila == KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA)
    .pop();
  if (hyvaksyntaaOdottava) {
    // Nähtävilläolovaihe odottaa hyväksyntää. Se on hylättävä ennen kuin on mahdollista palata suunnitteluun.
    return false;
  }
  if (nahtavillaoloVaihe?.uudelleenKuulutus) {
    const uudelleenKuulutettu = nahtavillaoloVaiheJulkaisut
      ?.filter((julkaisu) => julkaisu.tila === KuulutusJulkaisuTila.HYVAKSYTTY && julkaisu.uudelleenKuulutus)
      .pop();
    if (!uudelleenKuulutettu) {
      // Uudelleenkuulutus on avattu nähtävilläoloon, mutta sitä ei ole julkaistu. Ei ole mahdollista palata suunnitteluun.
      return false;
    }
  }
  if (hyvaksymisPaatosVaiheJulkaisut) {
    // Ollaan edetty jo hyväksymispäätösvaiheeseen. Ei ole mahdollista palata enää suunnitteluun.
    return false;
  }
  // Nähtävilläolovaihe on aloitettu, yhtään kuulutusta ei ole odottamassa hyväksyntää,
  // eikä uudelleenkuulutusta ole avattu, mutta jätetty julkaisematta.
  // On mahdollista siirtyä nähtävilläolovaiheesta suunnitteluun.
  return true;
}
