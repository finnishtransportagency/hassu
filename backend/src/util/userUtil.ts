import { KayttajaTyyppi } from "hassu-common/graphql/apiModel";
import { DBProjekti } from "../database/model";
import { organisaatioIsEvk } from "hassu-common/util/organisaatioIsElinvoimakeskus";
import { translate } from "./localization";
import { KaannettavaKieli } from "hassu-common/kaannettavatKielet";

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
    organisaatioIsEvk(projektiPaallikko?.organisaatio) && projektiPaallikko?.evkOrganisaatio
      ? translate("viranomainen." + projektiPaallikko.evkOrganisaatio, kieli)
      : translate("viranomainen.VAYLAVIRASTO", kieli);
  return {
    nimi: formatNimi(projektiPaallikko),
    organisaatio,
  };
}
