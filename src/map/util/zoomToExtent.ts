import { Extent, isEmpty } from "ol/extent";
import { fromExtent as polygonFromExtent } from "ol/geom/Polygon.js";
import View from "ol/View";

export function zoomToExtent(view: View, extent?: Extent | null) {
  const extentToFit = extent ?? view.getProjection().getExtent();
  if (!isEmpty(extentToFit)) {
    view.fitInternal(polygonFromExtent(extentToFit));
  }
}
