import { HyvaksymisEsitysToiminto, TeeHyvaksymisEsitysToimintoMutationVariables } from "hassu-common/graphql/apiModel";
import { tallenna } from "./tallenna";
import { requirePermissionLuku } from "../user";
import { lahetaHyvaksyttavaksi } from "./lahetaHyvaksyttavaksi";
import { avaaMuokkaus } from "./avaaMuokkaus";
import { hyvaksy } from "./hyvaksy";
import { hylkaa } from "./hylkaa";
import { suljeMuokkaus } from "./suljeMuokkaus";
import { projektiDatabase } from "../database/projektiDatabase";
import { IllegalArgumentError } from "hassu-common/error";

export async function teeHyvaksymisEsitysToiminto({
  teeHyvaksymisEsitysToimintoInput,
  toiminto,
}: TeeHyvaksymisEsitysToimintoMutationVariables): Promise<unknown> {
  requirePermissionLuku();
  const { oid } = teeHyvaksymisEsitysToimintoInput;
  const projektiInDB = await projektiDatabase.loadProjektiByOid(oid);
  if (!projektiInDB) {
    // Tätä erroria on käytetty muualla vastaavissa tilanteissa
    throw new IllegalArgumentError(`Projektia oid:lla ${oid} ei löydy`);
  }
  switch (toiminto) {
    case HyvaksymisEsitysToiminto.TALLENNA:
      await tallenna(teeHyvaksymisEsitysToimintoInput, projektiInDB);
      return oid;
    case HyvaksymisEsitysToiminto.TALLENNA_JA_LAHETA_HYVAKSYTTAVAKSI: {
      const updatedProjektiInDB = await tallenna(teeHyvaksymisEsitysToimintoInput, projektiInDB);
      return lahetaHyvaksyttavaksi(teeHyvaksymisEsitysToimintoInput, updatedProjektiInDB);
    }
    case HyvaksymisEsitysToiminto.AVAA_MUOKKAUS:
      return avaaMuokkaus(teeHyvaksymisEsitysToimintoInput, projektiInDB);
    case HyvaksymisEsitysToiminto.HYVAKSY:
      return hyvaksy(teeHyvaksymisEsitysToimintoInput, projektiInDB);
    case HyvaksymisEsitysToiminto.HYLKAA:
      return hylkaa(teeHyvaksymisEsitysToimintoInput, projektiInDB);
    case HyvaksymisEsitysToiminto.SULJE_MUOKKAUS:
      return suljeMuokkaus(teeHyvaksymisEsitysToimintoInput, projektiInDB);
    default:
      return null;
  }
}
