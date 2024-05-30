import { adaptHyvaksymisEsitysToAPI } from "../../projekti/adapter/adaptToAPI";
import { requirePermissionLuku } from "../../user";
import { haeProjektinTiedotHyvaksymisEsityksesta } from "../dynamoDBCalls";
import * as API from "hassu-common/graphql/apiModel";
import { adaptVelhoToProjektinPerustiedot } from "../adaptToApi/adaptVelhoToProjektinPerustiedot";

export default async function haeHyvaksymisEsityksenTiedot(oid: string): Promise<API.HyvaksymisEsityksenTiedot> {
  requirePermissionLuku();
  const projekti = await haeProjektinTiedotHyvaksymisEsityksesta(oid);
  const hyvaksymisEsitys = adaptHyvaksymisEsitysToAPI(projekti);
  const { versio, hyvaksymisPaatosVaihe } = projekti;

  return {
    __typename: "HyvaksymisEsityksenTiedot",
    oid,
    versio,
    hyvaksymisEsitys,
    muokkauksenVoiAvata: !hyvaksymisPaatosVaihe && hyvaksymisEsitys?.tila == API.HyvaksymisTila.HYVAKSYTTY,
    perustiedot: adaptVelhoToProjektinPerustiedot(projekti),
  };
}
