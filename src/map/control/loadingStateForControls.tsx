import { Control } from "ol/control";
import Map from "ol/Map";

export const IS_LOADING_KEY = "IS_LOADING_GEOMETRIES";

export const addIsLoadingPropertyChangeListenerForButtonDisabling = (control: Control, ...buttons: HTMLButtonElement[]) => {
  control.on("propertychange", (e) => {
    if (e.key === IS_LOADING_KEY) {
      buttons.forEach((button) => {
        button.disabled = control.get(IS_LOADING_KEY);
      });
    }
  });
};

export function setLoadingStateForControls(map: Map, isLoading: boolean) {
  map.getControls().forEach((control) => {
    control.set(IS_LOADING_KEY, isLoading);
  });
}
