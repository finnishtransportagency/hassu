import Control, { Options } from "ol/control/Control";
import Geometry from "ol/geom/Geometry";
import { Interaction, Select, Snap } from "ol/interaction";
import Draw, { createBox } from "ol/interaction/Draw";
import Modify from "ol/interaction/Modify";
import VectorSource from "ol/source/Vector";

type ButtonProps = {
  label: string | HTMLElement;
  tipLabel: string;
  className: string;
};

enum ButtonType {
  DRAW_STRING_LINE = "drawStringLine",
  DRAW_BOX = "drawBox",
  DRAW_POLYGON = "drawPolygon",
  UNDO = "undo",
  REMOVE_FEATURE = "removeFeature",
  CLEAR = "clear",
}

type DrawingButtonProps = Record<ButtonType, ButtonProps>;

const defaultDrawingButtonProps: DrawingButtonProps = {
  drawStringLine: { className: "ol-draw-line-string", label: "L", tipLabel: "Draw line string" },
  drawPolygon: { className: "ol-draw-polygon", label: "P", tipLabel: "Draw polygon" },
  drawBox: { className: "ol-draw-box", label: "B", tipLabel: "Draw box" },
  undo: { className: "ol-draw-undo", label: "U", tipLabel: "Undo" },
  removeFeature: { className: "ol-remove-feature", label: "R", tipLabel: "Remove selected feature" },
  clear: { className: "ol-draw-clear", label: "C", tipLabel: "Clear all geometries" },
};

type DrawControlProps = Options & {
  interactions: DrawToolInteractions;
  source: VectorSource<Geometry>;
} & Partial<Record<ButtonType, Partial<ButtonProps>>>;

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

  constructor(options: DrawControlProps) {
    const element = document.createElement("div");

    super({
      element: element,
      target: options.target,
    });

    element.className = "ol-draw ol-unselectable ol-control";

    function createButton({
      clickListener,
      options,
      type,
      disabled,
    }: {
      options: DrawControlProps;
      type: ButtonType;
      clickListener: (this: HTMLButtonElement, ev: MouseEvent) => any;
      disabled?: boolean;
    }) {
      const buttonOptions = options[type];
      const defaultOptions = defaultDrawingButtonProps[type];
      const button = document.createElement("button");
      button.className = buttonOptions?.className ?? defaultOptions.className;
      const label = buttonOptions?.label ?? defaultOptions.label;

      button.appendChild(typeof label === "string" ? document.createTextNode(label) : label);
      button.title = buttonOptions?.tipLabel ?? defaultOptions.tipLabel;
      button.disabled = !!disabled;
      button.addEventListener("click", clickListener, false);
      element.appendChild(button);
      return button;
    }

    const undoButton = createButton({
      options,
      type: ButtonType.UNDO,
      clickListener: this.undo.bind(this),
      disabled: true,
    });

    const removeFeatureButton = createButton({
      options,
      type: ButtonType.REMOVE_FEATURE,
      clickListener: this.removeSelectedFeature.bind(this),
      disabled: true,
    });

    const lineButton = createButton({
      options,
      type: ButtonType.DRAW_STRING_LINE,
      clickListener: this.toggleDrawOfType.bind(this, DrawType.LINE_STRING),
    });

    const polygonButton = createButton({
      options,
      type: ButtonType.DRAW_POLYGON,
      clickListener: this.toggleDrawOfType.bind(this, DrawType.POLYGON),
    });

    const boxButton = createButton({
      options,
      type: ButtonType.DRAW_BOX,
      clickListener: this.toggleDrawOfType.bind(this, DrawType.BOX),
    });

    const clearButton = createButton({ options, type: ButtonType.CLEAR, clickListener: this.removeAllFeatures.bind(this) });

    this.drawType = null;

    this.source = options.source;
    this.modify = options.interactions.MODIFY;
    this.drawTools = options.interactions.DRAW;
    this.select = options.interactions.SELECT;
    this.drawToolButtons = { Box: boxButton, LineString: lineButton, Polygon: polygonButton };

    Object.values(this.drawTools).forEach((draw) => {
      draw.on("drawstart", () => {
        undoButton.disabled = false;
        removeFeatureButton.disabled = false;
      });
      draw.on("drawend", () => {
        undoButton.disabled = true;
        removeFeatureButton.disabled = true;
      });
      draw.on("drawabort", () => {
        undoButton.disabled = true;
        removeFeatureButton.disabled = true;
      });
    });

    this.select.on("select", (e) => {
      removeFeatureButton.disabled = !e.selected.length;
    });

    this.select.getFeatures().on("change:length", () => {
      removeFeatureButton.disabled = !this.select.getFeatures().getLength();
    });

    this.source.on("addfeature", () => {
      clearButton.disabled = !this.source.getFeatures().length;
    });

    this.source.on("removefeature", () => {
      clearButton.disabled = !this.source.getFeatures().length;
    });
  }

  private removeAllFeatures() {
    this.source.getFeatures().forEach((feature) => {
      this.source.removeFeature(feature);
    });
  }

  private removeSelectedFeature() {
    this.currentDrawTool()?.abortDrawing();
    this.select.getFeatures().forEach((feature) => {
      this.source.removeFeature(feature);
      this.select.getFeatures().remove(feature);
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
    this.select.getFeatures().clear();
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
