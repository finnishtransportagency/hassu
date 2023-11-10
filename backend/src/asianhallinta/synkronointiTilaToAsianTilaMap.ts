import { SynkronointiTila } from "@hassu/asianhallinta";
import { AsianTila } from "hassu-common/graphql/apiModel";

export const synkronointiTilaToAsianTilaMap: Record<SynkronointiTila, AsianTila> = {
  ASIAA_EI_LOYDY: AsianTila.ASIAA_EI_LOYDY,
  ASIANHALLINTA_VAARASSA_TILASSA: AsianTila.ASIANHALLINTA_VAARASSA_TILASSA,
  SYNKRONOITU: AsianTila.SYNKRONOITU,
  VALMIS_VIENTIIN: AsianTila.VALMIS_VIENTIIN,
  VIRHE: AsianTila.VIRHE,
  VAARA_MENETTELYTAPA: AsianTila.VAARA_MENETTELYTAPA,
  VAARA_TOS_LUOKKA: AsianTila.VAARA_TOS_LUOKKA,
};
