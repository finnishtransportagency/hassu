import Control, { Options } from "ol/control/Control";
import { addIsLoadingPropertyChangeListenerForButtonDisabling } from "./loadingStateForControls";

type ButtonProps = {
  label?: string | HTMLElement;
  tipLabel?: string;
  className?: string;
  button?: HTMLButtonElement;
  handleClick: (event: Event) => void;
};

type SaveGeoJsonControlOptions = Options & {
  buttons: ButtonProps[];
};

class SaveGeoJsonControl extends Control {
  constructor(options: SaveGeoJsonControlOptions) {
    const element = document.createElement("div");

    super({
      element: element,
      target: options.target,
    });

    element.className = "ol-save-as-geo-json ol-unselectable ol-control";
    options.buttons.forEach((buttonProps, index) => {
      const button = buttonProps.button ?? document.createElement("button");
      if (!buttonProps.button) {
        const label = buttonProps.label ?? `S${index + 1}`;
        button.appendChild(typeof label === "string" ? document.createTextNode(label) : label);
        button.title = buttonProps.tipLabel ?? `Save${index + 1}`;
      }
      button.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          event.stopPropagation();
          buttonProps.handleClick(event);
        },
        false
      );
      element.appendChild(button);
      addIsLoadingPropertyChangeListenerForButtonDisabling(this, button);
    });
  }
}

export default SaveGeoJsonControl;
