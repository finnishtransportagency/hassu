import Control, { Options } from "ol/control/Control";
import Geometry, { Type } from "ol/geom/Geometry";
import Draw, { createBox } from "ol/interaction/Draw";
import VectorSource from "ol/source/Vector";

type DrawLineControlProps = Options & {
  source: VectorSource<Geometry>;
};

enum DrawType {
  NONE = "None",
  LINE_STRING = "LineString",
  POLYGON = "Polygon",
  BOX = "Box",
}

class DrawControl extends Control {
  private source: VectorSource<Geometry> | undefined;
  private draw: Draw;
  private drawType: DrawType;

  constructor(opt_options: DrawLineControlProps) {
    const options = opt_options || {};

    const lineButton = document.createElement("button");
    lineButton.className = "ol-draw-string-line";
    lineButton.innerHTML = "L";

    const polygonButton = document.createElement("button");
    polygonButton.className = "ol-draw-polygon";
    polygonButton.innerHTML = "P";

    const boxButton = document.createElement("button");
    boxButton.className = "ol-draw-box";
    boxButton.innerHTML = "B";

    const undoButton = document.createElement("button");
    undoButton.className = "ol-draw-undo";
    undoButton.innerHTML = "U";

    const element = document.createElement("div");
    element.className = "ol-draw ol-unselectable ol-control";
    element.appendChild(lineButton);
    element.appendChild(polygonButton);
    element.appendChild(boxButton);
    element.appendChild(undoButton);

    super({
      element: element,
      target: options.target,
    });

    this.drawType = DrawType.NONE;
    this.source = options.source;
    this.draw = new Draw({ source: this.source, type: "LineString" });

    lineButton.addEventListener("click", this.toggleDrawOfType.bind(this, DrawType.LINE_STRING), false);
    boxButton.addEventListener("click", this.toggleDrawOfType.bind(this, DrawType.BOX), false);
    polygonButton.addEventListener("click", this.toggleDrawOfType.bind(this, DrawType.POLYGON), false);
    undoButton.addEventListener("click", this.undo.bind(this), false);
  }

  undo() {
    this.draw.removeLastPoint();
  }

  toggleDrawOfType(drawType: DrawType) {
    this.getMap()?.removeInteraction(this.draw);
    if (this.drawType === drawType) {
      this.drawType = DrawType.NONE;
      return;
    }

    this.drawType = drawType;
    const draw = isBaseType(drawType)
      ? new Draw({ source: this.source, type: drawType })
      : new Draw({ source: this.source, type: "Circle", geometryFunction: createBox() });
    this.draw = draw;
    this.getMap()?.addInteraction(draw);
  }
}

function isBaseType(drawType: string): drawType is Type {
  return ["LineString", "Polygon"].includes(drawType);
}

export default DrawControl;
