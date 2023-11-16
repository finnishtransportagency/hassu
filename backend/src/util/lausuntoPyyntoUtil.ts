import { KuulutusJulkaisuTila } from "hassu-common/graphql/apiModel";
import { DBProjekti, LausuntoPyynnonTaydennys, LausuntoPyynto, NahtavillaoloVaiheJulkaisu } from "../database/model";
import { nyt, parseDate } from "./dateUtil";

/**
 *
 * @param projekti
 * @returns latest public nahtavillaoloVaiheJulkaisu, or latest HYVAKSYTTY nahtavillaoloVaiheJulkaisu, if none are public
 */
export function findLatestHyvaksyttyJulkinenNahtavillaoloVaiheJulkaisu(
  projekti: Pick<DBProjekti, "nahtavillaoloVaiheJulkaisut">
): NahtavillaoloVaiheJulkaisu | undefined {
  if (projekti.nahtavillaoloVaiheJulkaisut) {
    const hyvaksytyt = projekti.nahtavillaoloVaiheJulkaisut.filter((julkaisu) => julkaisu.tila === KuulutusJulkaisuTila.HYVAKSYTTY);
    const viimeisinJulkinen = hyvaksytyt
      .filter((julkaisu) => julkaisu.kuulutusPaiva && parseDate(julkaisu.kuulutusPaiva).isBefore(nyt()))
      .pop();
    return viimeisinJulkinen || hyvaksytyt.pop();
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
