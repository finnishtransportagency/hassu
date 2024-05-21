import { DBProjekti } from "../../backend/src/database/model";
import { KayttajaTyyppi, NykyinenKayttaja, Projekti } from "../graphql/apiModel";

export function userIsAdmin(kayttaja?: NykyinenKayttaja) {
  return !!kayttaja?.roolit?.includes("hassu_admin");
}
export function userHasAccessToProjekti({
  kayttaja,
  projekti,
}: {
  kayttaja?: NykyinenKayttaja;
  projekti?: Pick<Projekti, "kayttoOikeudet"> | Pick<DBProjekti, "kayttoOikeudet">;
}) {
  return !!kayttaja?.uid && !!projekti?.kayttoOikeudet?.some(({ kayttajatunnus }) => kayttaja.uid === kayttajatunnus);
}

/**
 * Tämä tyyppi on luotu, koska lintterin kanssa oli jotain ihme häikkää
 */
type GenKayttoOikeus = {
  kayttajatunnus: string;
  tyyppi: string;
};
export function userIsProjectManagerOrSubstitute({
  kayttaja,
  projekti,
}: {
  kayttaja?: NykyinenKayttaja;
  projekti?: Pick<Projekti, "kayttoOikeudet"> | Pick<DBProjekti, "kayttoOikeudet">;
}): boolean {
  return (
    !!kayttaja?.uid &&
    !!(projekti?.kayttoOikeudet as GenKayttoOikeus[] | undefined | null)?.find(
      ({ kayttajatunnus, tyyppi }) =>
        kayttaja.uid === kayttajatunnus && (tyyppi === KayttajaTyyppi.PROJEKTIPAALLIKKO || tyyppi === KayttajaTyyppi.VARAHENKILO)
    )
  );
}
