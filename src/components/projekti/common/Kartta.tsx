import { useEffect, useRef } from "react";
import Map from "ol/Map";
import View from "ol/View";
import Projection from "ol/proj/Projection";
import TileLayer from "ol/layer/Tile";
import { get as getProjection } from "ol/proj";
import XYZ from "ol/source/XYZ";
import proj4 from "proj4";
import { register } from "ol/proj/proj4";
import TileGrid from "ol/tilegrid/TileGrid";

proj4.defs("EPSG:3067", "+proj=utm +zone=35 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs");
register(proj4);
const projection = getProjection("EPSG:3067") as Projection;
projection.setExtent([-548576, 6291456, 1548576, 8388608]);
const resolutions = [8192, 4096, 2048, 1024, 512, 256, 128, 64, 32, 16, 8, 4, 2, 1];
let map: Map | undefined = undefined;
export function Kartta() {
  const mapElement = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!map) {
      map = new Map({
        layers: [
          new TileLayer({
            source: new XYZ({
              projection: projection,
              tileGrid: new TileGrid({
                resolutions,
                tileSize: [256, 256],
                extent: [-548576, 6291456, 1548576, 8388608],
              }),
              urls: ["/hassu/karttakuva/avoin/wmts/1.0.0/taustakartta/default/ETRS-TM35FIN/{z}/{y}/{x}.png"],
            }),
          }),
        ],
        view: new View({
          projection,
          center: [384920, 6671856],
          resolutions,
          resolution: 128,
          extent: [61000, 6605000, 733000, 7777000],
          constrainOnlyCenter: true,
        }),
      });
    }
    if (mapElement.current) {
      map.setTarget(mapElement.current);
    }
  }, []);
  return <div id="map" style={{ width: "300px", height: "300px" }} ref={mapElement}></div>;
}
