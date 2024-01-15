import { ShowMessage } from "@components/HassuSnackbarProvider";
import { API } from "@services/api/commonApi";
import Control, { Options } from "ol/control/Control";
import GeoJSON from "ol/format/GeoJSON";
import Geometry from "ol/geom/Geometry";
import VectorSource from "ol/source/Vector";

type TallennaControlOptions = Options & {
  source: VectorSource<Geometry>;
  showErrorMessage: ShowMessage;
  showSuccessMessage: ShowMessage;
  label?: string | HTMLElement;
  tipLabel?: string;
  api: API;
  oid: string;
};

class TallennaControl extends Control {
  private source: VectorSource<Geometry>;
  private readonly geoJSON = new GeoJSON();
  private showErrorMessage: ShowMessage;
  private showSuccessMessage: ShowMessage;
  private api: API;
  private oid: string;

  constructor(options: TallennaControlOptions) {
    const element = document.createElement("div");

    super({
      element: element,
      target: options.target,
    });

    element.className = "ol-save-as-geo-json ol-unselectable ol-control";

    const button = document.createElement("button");
    const label = options.label ?? "S";
    button.appendChild(typeof label === "string" ? document.createTextNode(label) : label);
    button.title = options.tipLabel ?? "Save as GeoJSON file";
    button.addEventListener("click", this.writeGeoJsonFile.bind(this), false);
    element.appendChild(button);

    this.source = options.source;
    this.showErrorMessage = options.showErrorMessage;
    this.showSuccessMessage = options.showSuccessMessage;
    this.api = options.api;
    this.oid = options.oid;
  }

  private async writeGeoJsonFile(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    try {
      const geoJSON = JSON.stringify(this.geoJSON.writeFeaturesObject(this.source.getFeatures()));
      await this.api.tuoKarttarajaus(this.oid, geoJSON);
      this.showSuccessMessage("Karttarajaus tallennettu");
    } catch {
      this.showErrorMessage("Karttarajauksen muuttaminen tiedostoksi epäonnistui");
    }
  }
}

export default TallennaControl;
