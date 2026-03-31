import {
  AnyProjektiDataItem,
  HyvaksymisPaatosVaiheJulkaisu,
  hyvaksymisPaatosVaiheJulkaisuPrefix,
  JatkoPaatos1VaiheJulkaisu,
  jatkopaatos1VaiheJulkaisuPrefix,
  JatkoPaatos2VaiheJulkaisu,
  jatkopaatos2VaiheJulkaisuPrefix,
  DBProjekti,
  PaatosVaiheJulkaisu,
} from "./model";

function isHyvaksymisPaatosJulkaisu(item: AnyProjektiDataItem): item is HyvaksymisPaatosVaiheJulkaisu {
  return item.sortKey.startsWith(hyvaksymisPaatosVaiheJulkaisuPrefix);
}
function isJatkoPaatos1Julkaisu(item: AnyProjektiDataItem): item is JatkoPaatos1VaiheJulkaisu {
  return item.sortKey.startsWith(jatkopaatos1VaiheJulkaisuPrefix);
}
function isJatkoPaatos2Julkaisu(item: AnyProjektiDataItem): item is JatkoPaatos2VaiheJulkaisu {
  return item.sortKey.startsWith(jatkopaatos2VaiheJulkaisuPrefix);
}
type ProjektiEntitiesGroupedByType = Pick<
  DBProjekti,
  "hyvaksymisPaatosVaiheJulkaisut" | "jatkoPaatos1VaiheJulkaisut" | "jatkoPaatos2VaiheJulkaisut"
>;

export function groupProjektiEntitiesByType(entities: PaatosVaiheJulkaisu[]): ProjektiEntitiesGroupedByType {
  return entities.reduce((acc: ProjektiEntitiesGroupedByType, item: PaatosVaiheJulkaisu): ProjektiEntitiesGroupedByType => {
    if (isHyvaksymisPaatosJulkaisu(item)) {
      if (!acc.hyvaksymisPaatosVaiheJulkaisut) {
        acc.hyvaksymisPaatosVaiheJulkaisut = [];
      }
      acc.hyvaksymisPaatosVaiheJulkaisut.push(item);
    } else if (isJatkoPaatos1Julkaisu(item)) {
      if (!acc.jatkoPaatos1VaiheJulkaisut) {
        acc.jatkoPaatos1VaiheJulkaisut = [];
      }
      acc.jatkoPaatos1VaiheJulkaisut.push(item);
    } else if (isJatkoPaatos2Julkaisu(item)) {
      if (!acc.jatkoPaatos2VaiheJulkaisut) {
        acc.jatkoPaatos2VaiheJulkaisut = [];
      }
      acc.jatkoPaatos2VaiheJulkaisut.push(item);
    }
    return acc;
  }, {});
}
