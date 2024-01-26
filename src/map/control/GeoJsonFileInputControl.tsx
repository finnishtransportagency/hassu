import { ShowMessage } from "@components/HassuSnackbarProvider";
import Control, { Options } from "ol/control/Control";
import GeoJSON from "ol/format/GeoJSON";
import Geometry from "ol/geom/Geometry";
import VectorSource from "ol/source/Vector";
import { GeometryExceedsAreaLimitError } from "../exception/GeometryExceedsAreaLimitError";
import { UnsupportedGeometryTypeError } from "../exception/UnsupportedGeometryTypeError";
import { zoomToExtent } from "../util/zoomToExtent";

type GeoJsonFileInputControlProps = Options & {
  source: VectorSource<Geometry>;
  showErrorMessage: ShowMessage;
  showSuccessMessage: ShowMessage;
  label?: string | HTMLElement;
  tipLabel?: string;
  validateSelection: (geom: Geometry | undefined) => {};
};

const GEOJSON_MIME = "application/geo+json";

class GeoJsonFileInputControl extends Control {
  private source: VectorSource<Geometry>;
  private input: HTMLInputElement;
  private reader: FileReader;
  private showErrorMessage: ShowMessage;
  private showSuccessMessage: ShowMessage;
  private readonly geoJSON = new GeoJSON();
  private validateSelection: (geom: Geometry | undefined) => {};

  constructor(options: GeoJsonFileInputControlProps) {
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
    this.validateSelection = options.validateSelection;
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
      const features = this.geoJSON.readFeatures(obj);

      const errors: Error[] = [];
      const suodatetut = features.filter((feat) => {
        try {
          this.validateSelection(feat.getGeometry());
          return true;
        } catch (e) {
          if (e instanceof Error) {
            errors.push(e);
          }
        }
        return false;
      });

      this.source.addFeatures(suodatetut);
      zoomToExtent(map, this.source.getExtent());
      const unsupportedGeometryError = errors.some((error) => error instanceof UnsupportedGeometryTypeError);
      const areaLimitError = errors.some((error) => error instanceof GeometryExceedsAreaLimitError);
      if (!errors.length) {
        this.showSuccessMessage("Karttarajaus luettu tiedostosta");
      } else {
        this.showErrorMessage(
          `${suodatetut.length ? "Osa karttarajauksen geometrioista" : "Karttarajauksen geometriat"} suodatettiin pois.` +
            (unsupportedGeometryError
              ? " Karttarajaus sisältää ei tuettuja geometriatyyppejä. Tällä hetkellä järjestelmä tukee vain Polygon-tyyppisiä geometrioita."
              : "") +
            (areaLimitError ? " Karttarajaus on liian suuri. Tee karttarajauksesta pienempi." : "")
        );
      }
    } catch (e) {
      console.log(e);
      this.showErrorMessage("Tiedoston lukeminen epäonnistui");
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

export default GeoJsonFileInputControl;
