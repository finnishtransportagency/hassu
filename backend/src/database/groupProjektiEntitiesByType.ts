import {
  AnyProjektiDataItem,
  HyvaksymisPaatosVaiheJulkaisu,
  hyvaksymisPaatosVaiheJulkaisuPrefix,
  JatkoPaatos1VaiheJulkaisu,
  jatkopaatos1VaiheJulkaisuPrefix,
  JatkoPaatos2VaiheJulkaisu,
  jatkopaatos2VaiheJulkaisuPrefix,
  DBProjekti,
  aloitusVaiheJulkaisuPrefix,
  nahtavillaoloVaiheJulkaisuPrefix,
  NahtavillaoloVaiheJulkaisu,
  AloitusKuulutusJulkaisu,
} from "./model";

function isAloitusJulkaisu(item: AnyProjektiDataItem): item is AloitusKuulutusJulkaisu {
  return item?.sortKey?.startsWith(aloitusVaiheJulkaisuPrefix);
}
function isNahtavillaoloJulkaisu(item: AnyProjektiDataItem): item is NahtavillaoloVaiheJulkaisu {
  return item?.sortKey?.startsWith(nahtavillaoloVaiheJulkaisuPrefix);
}
function isHyvaksymisPaatosJulkaisu(item: AnyProjektiDataItem): item is HyvaksymisPaatosVaiheJulkaisu {
  return item?.sortKey?.startsWith(hyvaksymisPaatosVaiheJulkaisuPrefix);
}
function isJatkoPaatos1Julkaisu(item: AnyProjektiDataItem): item is JatkoPaatos1VaiheJulkaisu {
  return item?.sortKey?.startsWith(jatkopaatos1VaiheJulkaisuPrefix);
}
function isJatkoPaatos2Julkaisu(item: AnyProjektiDataItem): item is JatkoPaatos2VaiheJulkaisu {
  return item?.sortKey?.startsWith(jatkopaatos2VaiheJulkaisuPrefix);
}

export type ProjektiEntitiesGroupedByType = Pick<
  DBProjekti,
  | "aloitusKuulutusJulkaisut"
  | "nahtavillaoloVaiheJulkaisut"
  | "hyvaksymisPaatosVaiheJulkaisut"
  | "jatkoPaatos1VaiheJulkaisut"
  | "jatkoPaatos2VaiheJulkaisut"
>;

export function groupProjektiEntitiesByType(entities: AnyProjektiDataItem[]): ProjektiEntitiesGroupedByType {
  return entities.reduce((acc: ProjektiEntitiesGroupedByType, item: AnyProjektiDataItem): ProjektiEntitiesGroupedByType => {
    if (isAloitusJulkaisu(item)) {
      if (!acc.aloitusKuulutusJulkaisut) {
        acc.aloitusKuulutusJulkaisut = [];
      }
      acc.aloitusKuulutusJulkaisut.push(item);
    } else if (isNahtavillaoloJulkaisu(item)) {
      if (!acc.nahtavillaoloVaiheJulkaisut) {
        acc.nahtavillaoloVaiheJulkaisut = [];
      }
      acc.nahtavillaoloVaiheJulkaisut.push(item);
    } else if (isHyvaksymisPaatosJulkaisu(item)) {
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
