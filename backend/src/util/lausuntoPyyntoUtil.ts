import { KuulutusJulkaisuTila } from "hassu-common/graphql/apiModel";
import { DBProjekti, LausuntoPyynnonTaydennys, LausuntoPyynto, NahtavillaoloVaiheJulkaisu } from "../database/model";

export function findLatestHyvaksyttyNahtavillaoloVaiheJulkaisu(projekti: DBProjekti): NahtavillaoloVaiheJulkaisu | undefined {
  if (projekti.nahtavillaoloVaiheJulkaisut) {
    projekti.nahtavillaoloVaiheJulkaisut.filter((julkaisu) => julkaisu.tila === KuulutusJulkaisuTila.HYVAKSYTTY).pop();
  } else {
    return undefined;
  }
}

export function findLausuntoPyyntoById(projekti: DBProjekti, lausuntoPyyntoId: number): LausuntoPyynto | undefined {
  if (projekti.lausuntoPyynnot) {
    return projekti.lausuntoPyynnot.filter((pyynto) => pyynto.id === lausuntoPyyntoId).pop();
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
