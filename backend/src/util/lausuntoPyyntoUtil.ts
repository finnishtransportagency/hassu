import { KuulutusJulkaisuTila } from "hassu-common/graphql/apiModel";
import {
  DBProjekti,
  HyvaksymisPaatosVaihe,
  HyvaksymisPaatosVaiheJulkaisu,
  LausuntoPyynnonTaydennys,
  LausuntoPyynto,
  NahtavillaoloVaihe,
  NahtavillaoloVaiheJulkaisu,
} from "../database/model";

export function findLatestHyvaksyttyNahtavillaoloVaiheJulkaisu(
  projekti: Pick<DBProjekti, "nahtavillaoloVaiheJulkaisut" | "nahtavillaoloVaihe">
): NahtavillaoloVaiheJulkaisu | NahtavillaoloVaihe | undefined {
  return (
    projekti.nahtavillaoloVaiheJulkaisut?.filter((julkaisu) => julkaisu.tila === KuulutusJulkaisuTila.HYVAKSYTTY).pop() ??
    projekti.nahtavillaoloVaihe ??
    undefined
  );
}

type PaatosVaihe = HyvaksymisPaatosVaiheJulkaisu | HyvaksymisPaatosVaihe | undefined;

export function findLatestHyvaksyttyHyvaksymispaatosVaiheJulkaisu(
  projekti: Pick<DBProjekti, "hyvaksymisPaatosVaiheJulkaisut" | "hyvaksymisPaatosVaihe">
): PaatosVaihe {
  return (
    projekti.hyvaksymisPaatosVaiheJulkaisut?.filter((julkaisu) => julkaisu.tila === KuulutusJulkaisuTila.HYVAKSYTTY).pop() ??
    projekti.hyvaksymisPaatosVaihe ??
    undefined
  );
}

export function findLatestJatko1paatosVaiheJulkaisu(
  projekti: Pick<DBProjekti, "jatkoPaatos1VaiheJulkaisut" | "jatkoPaatos1Vaihe">
): PaatosVaihe {
  return (
    projekti.jatkoPaatos1VaiheJulkaisut?.filter((julkaisu) => julkaisu.tila === KuulutusJulkaisuTila.HYVAKSYTTY).pop() ??
    projekti.jatkoPaatos1Vaihe ??
    undefined
  );
}

export function findLatestJatko2paatosVaiheJulkaisu(
  projekti: Pick<DBProjekti, "jatkoPaatos2VaiheJulkaisut" | "jatkoPaatos2Vaihe">
): PaatosVaihe {
  return (
    projekti.jatkoPaatos2VaiheJulkaisut?.filter((julkaisu) => julkaisu.tila === KuulutusJulkaisuTila.HYVAKSYTTY).pop() ??
    projekti.jatkoPaatos2Vaihe ??
    undefined
  );
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
