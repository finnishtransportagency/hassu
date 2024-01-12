import Control, { Options } from "ol/control/Control";
import Geometry from "ol/geom/Geometry";
import { Interaction, Select, Snap } from "ol/interaction";
import Draw, { createBox } from "ol/interaction/Draw";
import Modify from "ol/interaction/Modify";
import VectorSource from "ol/source/Vector";

type DrawLineControlProps = Options & {
  interactions: DrawToolInteractions;
  source: VectorSource<Geometry>;
};

enum DrawType {
  LINE_STRING = "LineString",
  POLYGON = "Polygon",
  BOX = "Box",
}

enum InteractionType {
  DRAW = "DRAW",
  MODIFY = "MODIFY",
  SNAP = "SNAP",
  SELECT = "SELECT",
}

class DrawControl extends Control {
  private modify: Modify;
  private select: Select;
  private drawType: DrawType | null;
  private drawTools: Record<DrawType, Draw>;
  private source: VectorSource<Geometry>;

  constructor(options: DrawLineControlProps) {
    const deleteButton = document.createElement("button");
    deleteButton.className = "ol-draw-delete";
    deleteButton.innerHTML = "D";

    const removeFeatureButton = document.createElement("button");
    removeFeatureButton.className = "ol-draw-remove-feature";
    removeFeatureButton.innerHTML = "R";

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
    element.appendChild(removeFeatureButton);
    element.appendChild(deleteButton);

    super({
      element: element,
      target: options.target,
    });

    this.drawType = null;

    this.source = options.source;
    this.modify = options.interactions.MODIFY;
    this.drawTools = options.interactions.DRAW;
    this.select = options.interactions.SELECT;

    lineButton.addEventListener("click", this.toggleDrawOfType.bind(this, DrawType.LINE_STRING), false);
    boxButton.addEventListener("click", this.toggleDrawOfType.bind(this, DrawType.BOX), false);
    polygonButton.addEventListener("click", this.toggleDrawOfType.bind(this, DrawType.POLYGON), false);
    undoButton.addEventListener("click", this.undo.bind(this), false);
    removeFeatureButton.addEventListener("click", this.removeFeature.bind(this), false);
    deleteButton.addEventListener("click", this.removeFeatures.bind(this), false);
  }

  private removeFeatures() {
    this.source.getFeatures().forEach((feature) => {
      this.source.removeFeature(feature);
    });
    this.select.setActive(false);
    this.modify.setActive(false);
  }

  private removeFeature() {
    this.select.getFeatures().forEach((feature) => {
      this.source.removeFeature(feature);
    });
    this.select.setActive(false);
    this.modify.setActive(false);
  }

  private undo() {
    this.currentDrawTool()?.removeLastPoint();
  }

  private toggleDrawOfType(drawType: DrawType) {
    this.currentDrawTool()?.setActive(false);
    if (this.drawType === drawType) {
      this.drawType = null;
      this.modify.setActive(true);
      this.select.setActive(true);
      return;
    }

    this.drawType = drawType;
    this.currentDrawTool()?.setActive(true);
    this.modify.setActive(false);
    this.select.setActive(false);
  }

  private currentDrawTool(): Draw | undefined {
    const drawTool = this.drawType ? this.drawTools[this.drawType] : undefined;
    return drawTool;
  }
}

export type DrawToolInteractions = {
  [InteractionType.DRAW]: Record<DrawType, Draw>;
  [InteractionType.MODIFY]: Modify;
  [InteractionType.SNAP]: Snap;
  [InteractionType.SELECT]: Select;
};

type CreateDrawToolInteractions = (source: VectorSource<Geometry>) => DrawToolInteractions;

function initInteraction<T extends Interaction>(interaction: T, active: boolean): T {
  interaction.setActive(active);
  return interaction;
}

export const createDrawToolInteractions: CreateDrawToolInteractions = (source) => {
  const select = initInteraction(new Select(), true);
  const modify = initInteraction(
    new Modify({
      features: select.getFeatures(),
    }),
    true
  );

  const selectedFeatures = select.getFeatures();
  select.on("change:active", function () {
    selectedFeatures.forEach(function (feature) {
      selectedFeatures.remove(feature);
    });
  });

  return {
    DRAW: {
      Polygon: initInteraction(new Draw({ source, type: "Polygon" }), false),
      LineString: initInteraction(
        new Draw({
          source,
          type: "LineString",
        }),
        false
      ),
      Box: initInteraction(
        new Draw({
          source,
          type: "Circle",
          geometryFunction: createBox(),
        }),
        false
      ),
    },
    SNAP: initInteraction(new Snap({ source }), true),
    MODIFY: modify,
    SELECT: select,
  };
};

export default DrawControl;
