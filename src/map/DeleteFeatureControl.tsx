import Control, { Options } from "ol/control/Control";
import Feature from "ol/Feature";
import Geometry from "ol/geom/Geometry";
import { Select } from "ol/interaction";
import BaseLayer from "ol/layer/Base";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Fill, Stroke, Style } from "ol/style";
import { StyleFunction } from "ol/style/Style";

type DrawLineControlProps = Options & {
  source: VectorSource<Geometry>;
  layer: VectorLayer<VectorSource<Geometry>>;
};

class DeleteFeatureControl extends Control {
  private source: VectorSource<Geometry> | undefined;
  private selected: Feature<Geometry>[] | undefined;

  constructor(opt_options: DrawLineControlProps) {
    const options = opt_options || {};

    const deleteButton = document.createElement("button");
    deleteButton.innerHTML = "D";

    const element = document.createElement("div");
    element.className = "ol-delete-geometry ol-unselectable ol-control";
    element.appendChild(deleteButton);

    super({
      element: element,
      target: options.target,
    });

    this.source = options.source;
    const selected = new Style({
      fill: new Fill({
        color: "#eeeeee",
      }),
      stroke: new Stroke({
        color: "rgba(255, 255, 255, 0.7)",
        width: 2,
      }),
    });

    const selectStyle: StyleFunction = (feature) => {
      const color = feature.get("COLOR") || "#eeeeee";
      selected.getFill().setColor(color);
      return selected;
    };

    // select interaction working on "singleclick"
    const select = new Select({ style: selectStyle, layers: [options.layer] });
    select.on("select", (e) => {
      console.log(e.selected);
      this.selected = e.selected;
    });
    this.getMap()?.addInteraction(select);

    deleteButton.addEventListener("click", this.deleteFeature.bind(this), false);
  }

  deleteFeature() {
    console.log("delete", this.selected, this.source);
    this.selected?.forEach((sel) => this.source?.removeFeature(sel));
  }
}

export default DeleteFeatureControl;
