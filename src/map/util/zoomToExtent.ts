import { Extent, isEmpty } from "ol/extent";
import { fromExtent as polygonFromExtent } from "ol/geom/Polygon.js";
import Map from "ol/Map";

export function zoomToExtent(map: Map, extent?: Extent | null) {
  const view = map.getView();
  const extentToFit = extent ?? view.getProjection().getExtent();
  if (!isEmpty(extentToFit)) {
    view.fitInternal(polygonFromExtent(extentToFit));
  }
}
