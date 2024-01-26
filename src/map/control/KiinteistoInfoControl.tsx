import Control, { Options } from "ol/control/Control";
import Geometry from "ol/geom/Geometry";
import VectorSource from "ol/source/Vector";

type TallennaControlOptions = Options & {
  geoJsonSource: VectorSource<Geometry>;
};

class InfoControl extends Control {
  private geoJsonSource: VectorSource<Geometry>;
  private span: HTMLSpanElement;

  constructor(options: TallennaControlOptions) {
    const element = document.createElement("div");

    super({
      element: element,
      target: options.target,
    });

    element.className = "ol-kiinteisto-info ol-unselectable ol-control";

    const span = document.createElement("span");
    element.appendChild(span);

    this.span = span;
    this.geoJsonSource = options.geoJsonSource;

    this.updateInfoText();
    this.geoJsonSource.on("addfeature", () => {
      this.updateInfoText();
    });
    this.geoJsonSource.on("removefeature", () => {
      this.updateInfoText();
    });
    this.geoJsonSource.on("clear", () => {
      this.updateInfoText();
    });
  }

  private updateInfoText() {
    const kiinteistotunnukset = this.geoJsonSource.getFeatures().reduce<Set<string>>((set, feat) => {
      const kiinteistotunnus = feat.getProperties().kiinteistotunnuksenEsitysmuoto;
      if (kiinteistotunnus) {
        set.add(kiinteistotunnus);
      }
      return set;
    }, new Set());

    this.span.innerText = `Kiinteistöjä valittu ${kiinteistotunnukset.size} kpl`;
  }
}

export default InfoControl;
