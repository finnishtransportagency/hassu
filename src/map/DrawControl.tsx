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

  private drawToolButtons: Readonly<Record<DrawType, HTMLButtonElement>>;

  constructor(options: DrawLineControlProps) {
    const element = document.createElement("div");
    element.className = "ol-draw ol-unselectable ol-control";

    super({
      element: element,
      target: options.target,
    });

    const clearButton = document.createElement("button");
    clearButton.className = "ol-draw-clear";
    clearButton.innerHTML = "C";

    const removeFeatureButton = document.createElement("button");
    removeFeatureButton.className = "ol-draw-remove-feature";
    removeFeatureButton.innerHTML = "R";
    removeFeatureButton.disabled = true;

    const lineButton = document.createElement("button");
    lineButton.className = "ol-draw-line-string";
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
    undoButton.disabled = true;

    element.appendChild(lineButton);
    element.appendChild(polygonButton);
    element.appendChild(boxButton);
    element.appendChild(undoButton);
    element.appendChild(removeFeatureButton);
    element.appendChild(clearButton);

    this.drawType = null;

    this.source = options.source;
    this.modify = options.interactions.MODIFY;
    this.drawTools = options.interactions.DRAW;
    this.select = options.interactions.SELECT;
    this.drawToolButtons = { Box: boxButton, LineString: lineButton, Polygon: polygonButton };

    const selectedFeatures = this.select.getFeatures();
    this.select.on("change:active", function () {
      selectedFeatures.forEach(function (feature) {
        selectedFeatures.remove(feature);
      });
    });

    Object.values(this.drawTools).forEach((draw) => {
      draw.on("drawstart", () => {
        undoButton.disabled = false;
      });
      draw.on("drawend", () => {
        undoButton.disabled = true;
      });
      draw.on("drawabort", () => {
        undoButton.disabled = true;
      });
    });

    this.select.on("select", (e) => {
      removeFeatureButton.disabled = !e.selected.length;
    });

    this.source.on("addfeature", () => {
      clearButton.disabled = !this.source.getFeatures().length;
    });

    this.source.on("removefeature", () => {
      clearButton.disabled = !this.source.getFeatures().length;
    });

    lineButton.addEventListener("click", this.toggleDrawOfType.bind(this, DrawType.LINE_STRING), false);
    boxButton.addEventListener("click", this.toggleDrawOfType.bind(this, DrawType.BOX), false);
    polygonButton.addEventListener("click", this.toggleDrawOfType.bind(this, DrawType.POLYGON), false);
    undoButton.addEventListener("click", this.undo.bind(this), false);
    removeFeatureButton.addEventListener("click", this.removeSelectedFeature.bind(this), false);
    clearButton.addEventListener("click", this.removeAllFeatures.bind(this), false);
  }

  private removeAllFeatures() {
    this.source.getFeatures().forEach((feature) => {
      this.source.removeFeature(feature);
    });
  }

  private removeSelectedFeature() {
    this.select.getFeatures().forEach((feature) => {
      this.source.removeFeature(feature);
    });
  }

  private undo() {
    this.currentDrawTool()?.removeLastPoint();
  }

  private toggleDrawOfType(drawType: DrawType) {
    this.setDrawToolActive(false);
    if (this.drawType === drawType) {
      this.drawType = null;
      this.modify.setActive(true);
      this.select.setActive(true);
      return;
    }

    this.drawType = drawType;
    this.setDrawToolActive(true);
    this.modify.setActive(false);
    this.select.setActive(false);
  }

  private setDrawToolActive(active: boolean) {
    const previousTool = this.currentDrawTool();
    if (previousTool) {
      previousTool.setActive(active);
    }
    this.drawType && this.setButtonClassnames(this.drawType, active);
  }

  private setButtonClassnames(draw: DrawType, active: boolean) {
    const element = this.drawToolButtons[draw];
    const activeClassName = "draw-active";
    if (active) {
      element.classList.add(activeClassName);
    } else {
      element.classList.remove(activeClassName);
    }
  }

  private currentDrawTool(): Draw | undefined {
    return this.drawType ? this.drawTools[this.drawType] : undefined;
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
    MODIFY: initInteraction(
      new Modify({
        features: select.getFeatures(),
      }),
      true
    ),
    SELECT: select,
  };
};

export default DrawControl;
