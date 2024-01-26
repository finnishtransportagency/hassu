import { Control } from "ol/control";
import { Options } from "ol/control/ZoomToExtent";
import { CLASS_CONTROL, CLASS_UNSELECTABLE } from "ol/css";
import EventType from "ol/events/EventType";
import Geometry from "ol/geom/Geometry";
import VectorSource from "ol/source/Vector";
import { zoomToExtent } from "../util/zoomToExtent";

type HassuZoomToExtentProps = Omit<Options, "extent"> & {
  source: VectorSource<Geometry>;
};

class ZoomToSourceExtent extends Control {
  private source: VectorSource<Geometry>;

  constructor(options: HassuZoomToExtentProps) {
    super({
      element: document.createElement("div"),
      target: options.target,
    });

    this.source = options.source;

    const className = options.className ?? "ol-zoom-extent";

    const label = options.label ?? "E";
    const tipLabel = options.tipLabel ?? "Fit to extent";
    const button = document.createElement("button");
    button.setAttribute("type", "button");
    button.title = tipLabel;
    button.appendChild(typeof label === "string" ? document.createTextNode(label) : label);
    button.addEventListener(EventType.CLICK, this.handleClick_.bind(this), false);
    this.source.on("change", () => {
      button.disabled = !this.source.getFeatures().length;
    });

    const cssClasses = className + " " + CLASS_UNSELECTABLE + " " + CLASS_CONTROL;
    const element = this.element;
    element.className = cssClasses;
    element.appendChild(button);
  }

  handleClick_(event: Event) {
    event.preventDefault();
    this.handleZoomToExtent();
  }

  handleZoomToExtent() {
    const map = this.getMap();
    if (!map) {
      return;
    }
    zoomToExtent(map.getView(), this.source.getExtent());
  }
}

export default ZoomToSourceExtent;
