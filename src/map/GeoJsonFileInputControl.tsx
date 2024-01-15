import { ShowMessage } from "@components/HassuSnackbarProvider";
import Control, { Options } from "ol/control/Control";
import GeoJSON from "ol/format/GeoJSON";
import Geometry from "ol/geom/Geometry";
import VectorSource from "ol/source/Vector";
import { zoomToExtent } from "./zoomToExtent";

type GeoJsonFileInputControlProps = Options & {
  source: VectorSource<Geometry>;
  showErrorMessage: ShowMessage;
  showSuccessMessage: ShowMessage;
  label?: string | HTMLElement;
  tipLabel?: string;
};

const GEOJSON_MIME = "application/geo+json";
class GeoJsonFileInputControl extends Control {
  private source: VectorSource<Geometry>;
  private input: HTMLInputElement;
  private reader: FileReader;
  private showErrorMessage: ShowMessage;
  private showSuccessMessage: ShowMessage;
  private readonly geoJSON = new GeoJSON();

  constructor(options: GeoJsonFileInputControlProps) {
    const element = document.createElement("div");

    super({
      element: element,
      target: options.target,
    });

    element.className = "ol-geo-json ol-unselectable ol-control";

    const form = document.createElement("form");
    this.input = document.createElement("input");
    form.appendChild(this.input);
    this.input.type = "file";
    this.input.accept = ".geojson,application/geo+json";
    this.input.addEventListener("change", this.uploadGeoJSONFile.bind(this), false);

    const button = document.createElement("button");
    const label = options.label ?? "F";
    button.appendChild(typeof label === "string" ? document.createTextNode(label) : label);
    button.title = options.tipLabel ?? "Upload GeoJSON file";
    button.addEventListener("click", this.openDialog.bind(this), false);
    element.appendChild(button);

    this.reader = new FileReader();
    this.reader.onload = this.onReaderLoad.bind(this);

    this.source = options.source;
    this.showErrorMessage = options.showErrorMessage;
    this.showSuccessMessage = options.showSuccessMessage;
  }

  private uploadGeoJSONFile(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    const target = event.target as HTMLInputElement;
    const file = target?.files?.[0];

    if (!file) {
      return;
    } else if (file instanceof Blob && file.type === GEOJSON_MIME) {
      this.readFile(file);
    } else {
      this.showErrorMessage("Tiedosto ei ole oikeaa tyyppiä. Varmista, että kyseessä on GeoJSON-tiedosto.");
    }
  }

  private readFile(file: File) {
    try {
      this.reader.readAsText(file);
    } catch {
      this.showErrorMessage("Tiedoston lukeminen epäonnistui");
    }
  }

  onReaderLoad(ev: ProgressEvent<FileReader>) {
    const result = ev.target?.result;
    const map = this.getMap();
    if (!result) {
      this.showErrorMessage("Tiedoston lukeminen epäonnistui");
      return;
    }
    if (!map) {
      this.showErrorMessage("Kartta puuttuu");
      return;
    }

    try {
      const str = typeof result === "string" ? result : this.decodeBuffer(result);
      const obj = JSON.parse(str);
      this.source.clear();
      this.source.addFeatures(this.geoJSON.readFeatures(obj));
      // Clear input value so onchange will trigger for the same file
      this.input.value = "";
      zoomToExtent(map, this.source.getExtent());
      this.showSuccessMessage("Geometriat lisätty tiedostosta");
    } catch {
      this.showErrorMessage("Tiedoston lukeminen epäonnistui");
    }
  }

  private decodeBuffer(result: ArrayBuffer) {
    return new TextDecoder().decode(result);
  }

  private openDialog() {
    this.input.click();
  }
}

export default GeoJsonFileInputControl;
