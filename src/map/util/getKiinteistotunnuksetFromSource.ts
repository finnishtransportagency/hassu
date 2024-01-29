import VectorSource from "ol/source/Vector";

export const getKiinteistotunnuksetFromSource = (geoJsonSource: VectorSource) => {
  return geoJsonSource.getFeatures().reduce<Set<string>>((set, feat) => {
    const kiinteistotunnus = feat.getProperties().kiinteistotunnus;
    if (kiinteistotunnus) {
      set.add(kiinteistotunnus);
    }
    return set;
  }, new Set());
};
