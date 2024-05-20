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

export function userIsProjectManagerOrSubstitute({
  kayttaja,
  projekti,
}: {
  kayttaja?: NykyinenKayttaja;
  projekti?: Pick<Projekti, "kayttoOikeudet"> | Pick<DBProjekti, "kayttoOikeudet">;
}) {
  return (
    !!kayttaja?.uid &&
    !!projekti?.kayttoOikeudet?.find(
      ({ kayttajatunnus, tyyppi }) =>
        kayttaja.uid === kayttajatunnus && (tyyppi === KayttajaTyyppi.PROJEKTIPAALLIKKO || tyyppi === KayttajaTyyppi.VARAHENKILO)
    )
  );
}
