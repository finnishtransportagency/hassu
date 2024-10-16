import * as API from "hassu-common/graphql/apiModel";
import { IllegalArgumentError } from "hassu-common/error";
import { IlmoituksenVastaanottajat, KuntaVastaanottaja, MaakuntaVastaanottaja, ViranomaisVastaanottaja } from "../../../../database/model";
import { General, removeTypeName } from ".";

export function adaptIlmoituksenVastaanottajatToSave(
  vastaanottajat: API.IlmoituksenVastaanottajatInput | null | undefined
): IlmoituksenVastaanottajat | null | undefined {
  if (vastaanottajat === null) {
    return null;
  }
  if (vastaanottajat === undefined) {
    return undefined;
  }
  if (!vastaanottajat.kunnat) {
    throw new IllegalArgumentError("Ilmoituksen vastaanottajissa tulee olla kunnat mukana!");
  }
  const kunnat: API.KuntaVastaanottajaInput[] = vastaanottajat.kunnat;
  if (!vastaanottajat?.viranomaiset || vastaanottajat.viranomaiset.length === 0) {
    throw new IllegalArgumentError("Viranomaisvastaanottajia pitää olla vähintään yksi.");
  }
  const viranomaiset: ViranomaisVastaanottaja[] = vastaanottajat?.viranomaiset;
  const maakunnat =
    vastaanottajat.maakunnat && vastaanottajat.maakunnat.length > 0
      ? vastaanottajat.maakunnat.map((maakunta) => removeTypeName(maakunta as General<MaakuntaVastaanottaja>) as MaakuntaVastaanottaja)
      : undefined;
  return {
    kunnat: kunnat.map((kunta) => removeTypeName(kunta as General<KuntaVastaanottaja>) as KuntaVastaanottaja),
    viranomaiset: viranomaiset.map(
      (viranomainen) => removeTypeName(viranomainen as General<ViranomaisVastaanottaja>) as ViranomaisVastaanottaja
    ),
    maakunnat,
  };
}
