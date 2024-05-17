import Control, { Options } from "ol/control/Control";
import GeoJSON from "ol/format/GeoJSON";
import Geometry from "ol/geom/Geometry";
import VectorSource from "ol/source/Vector";
import { addIsLoadingPropertyChangeListenerForButtonDisabling } from "./loadingStateForControls";
import Feature from "ol/Feature";
import { EPSG_3067 } from "@components/projekti/common/StyledMap";

export type ReadFeaturesFromGeoJsonFileInputControlOptions = Options & {
  source: VectorSource<Geometry>;
  label?: string | HTMLElement;
  tipLabel?: string;
  button: HTMLButtonElement;
  onGeoJsonUpload: (features: Feature<Geometry>[]) => void;
  onInvalidFileType: (file: File) => void;
  onReaderFailure: (e: unknown, file: File) => void;
  onReadFeaturesFailure: (e: unknown) => void;
};

class ReadFeaturesFromGeoJsonFileInputControl extends Control {
  private input: HTMLInputElement;
  private reader: FileReader;
  private readonly geoJSON = new GeoJSON();
  private onGeoJsonUpload: (features: Feature<Geometry>[]) => void;
  private onInvalidFileType: (file: File) => void;
  private onReaderFailure: (e: unknown, file: File) => void;
  private onReadFeaturesFailure: (e: unknown) => void;

  constructor(options: ReadFeaturesFromGeoJsonFileInputControlOptions) {
    const element = document.createElement("div");

    super({
      element: element,
      target: options.target,
    });

    element.className = "ol-geo-json ol-unselectable ol-control";

    this.input = document.createElement("input");
    this.input.type = "file";
    this.input.accept = ".geojson,application/geo+json";
    this.input.addEventListener("change", this.uploadGeoJSONFile.bind(this), false);

    const form = document.createElement("form");
    form.setAttribute("style", "display:none;");
    form.appendChild(this.input);
    element.appendChild(form);

    const button = options.button ?? document.createElement("button");
    if (!options.button) {
      const label = options.label ?? "F";
      button.appendChild(typeof label === "string" ? document.createTextNode(label) : label);
      button.title = options.tipLabel ?? "Upload GeoJSON file";
    }
    button.addEventListener("click", this.openDialog.bind(this), false);
    element.appendChild(button);

    this.reader = new FileReader();
    this.reader.onload = this.onReaderLoad.bind(this);
    addIsLoadingPropertyChangeListenerForButtonDisabling(this, button);

    this.onGeoJsonUpload = options.onGeoJsonUpload;
    this.onInvalidFileType = options.onInvalidFileType;
    this.onReaderFailure = options.onReaderFailure;
    this.onReadFeaturesFailure = options.onReadFeaturesFailure;
  }

  private uploadGeoJSONFile(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    const target = event.target as HTMLInputElement;
    const file = target?.files?.[0];

    if (!file) {
      return;
    } else if (file instanceof Blob) {
      this.readFile(file);
    } else {
      this.onInvalidFileType(file);
    }
  }

  private readFile(file: File) {
    try {
      this.reader.readAsText(file);
    } catch (e) {
      this.onReaderFailure(e, file);
    }
  }

  onReaderLoad(ev: ProgressEvent<FileReader>) {
    const result = ev.target?.result;
    try {
      if (!result) {
        throw new Error("Tiedoston sisältö oli tyhjää");
      }
      const str = typeof result === "string" ? result : this.decodeBuffer(result);
      const obj = JSON.parse(str);
      const features = this.geoJSON.readFeatures(obj, { dataProjection: obj.crs?.properties?.name ?? EPSG_3067, featureProjection: EPSG_3067 });

      this.onGeoJsonUpload(features);
    } catch (e) {
      this.onReadFeaturesFailure(e);
    }
    // Clear input value so onchange will trigger for the same file
    this.input.value = "";
  }

  private decodeBuffer(result: ArrayBuffer) {
    return new TextDecoder().decode(result);
  }

  private openDialog() {
    this.input.click();
  }
}

export default ReadFeaturesFromGeoJsonFileInputControl;
