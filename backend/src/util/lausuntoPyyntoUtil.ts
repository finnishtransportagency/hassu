import { KuulutusJulkaisuTila } from "hassu-common/graphql/apiModel";
import { DBProjekti, LausuntoPyynnonTaydennys, LausuntoPyynto, NahtavillaoloVaiheJulkaisu } from "../database/model";

export function findLatestHyvaksyttyNahtavillaoloVaiheJulkaisu(
  projekti: Pick<DBProjekti, "nahtavillaoloVaiheJulkaisut">
): NahtavillaoloVaiheJulkaisu | undefined {
  if (projekti.nahtavillaoloVaiheJulkaisut) {
    return projekti.nahtavillaoloVaiheJulkaisut.filter((julkaisu) => julkaisu.tila === KuulutusJulkaisuTila.HYVAKSYTTY).pop();
  } else {
    return undefined;
  }
}

export function findLausuntoPyyntoByUuid(projekti: DBProjekti, uuid: string): LausuntoPyynto | undefined {
  if (projekti.lausuntoPyynnot) {
    return projekti.lausuntoPyynnot.filter((pyynto) => pyynto.uuid === uuid).pop();
  } else {
    return undefined;
  }
}

export function findLausuntoPyynnonTaydennysByUuid(projekti: DBProjekti, uuid: string): LausuntoPyynnonTaydennys | undefined {
  if (projekti.lausuntoPyynnonTaydennykset) {
    return projekti.lausuntoPyynnonTaydennykset.filter((pyynto) => pyynto.uuid === uuid).pop();
  } else {
    return undefined;
  }
}

export function findLausuntoPyynnonTaydennysByKunta(projekti: DBProjekti, kunta: number): LausuntoPyynnonTaydennys | undefined {
  if (projekti.lausuntoPyynnonTaydennykset) {
    return projekti.lausuntoPyynnonTaydennykset.filter((pyynto) => pyynto.kunta === kunta).pop();
  } else {
    return undefined;
  }
}
