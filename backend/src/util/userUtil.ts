import { KayttajaTyyppi } from "hassu-common/graphql/apiModel";
import { DBProjekti } from "../database/model";
import { organisaatioIsEly } from "./organisaatioIsEly";
import { translate } from "./localization";
import { KaannettavaKieli } from "hassu-common/kaannettavatKielet";

export function isAorL(uid: string | undefined | null): boolean {
  if (uid) {
    return isATunnus(uid) || isLTunnus(uid);
  }
  return false;
}

function isATunnus(uid: string) {
  if (uid) {
    return !!uid.match(/^A[\d]+/)?.pop();
  }
  return false;
}

function isLTunnus(uid: string) {
  if (uid) {
    return !!uid.match(/^L[\d]+/)?.pop();
  }
  return false;
}

export function formatNimi(nimi: { etunimi: string; sukunimi: string } | null | undefined): string {
  if (!nimi) {
    return "";
  }
  const { etunimi, sukunimi } = nimi;
  return etunimi + " " + sukunimi;
}

export function getProjektipaallikkoAndOrganisaatio(projekti: DBProjekti, kieli: KaannettavaKieli) {
  const projektiPaallikko = projekti.kayttoOikeudet?.find((oikeus) => oikeus.tyyppi === KayttajaTyyppi.PROJEKTIPAALLIKKO);
  const organisaatio =
    organisaatioIsEly(projektiPaallikko?.organisaatio) && projektiPaallikko?.elyOrganisaatio
      ? translate("viranomainen." + projektiPaallikko.elyOrganisaatio, kieli)
      : translate("viranomainen.VAYLAVIRASTO", kieli);
  return {
    nimi: formatNimi(projektiPaallikko),
    organisaatio,
  };
}
