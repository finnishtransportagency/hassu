import { useEffect, useRef } from "react";
import Map from "ol/Map";
import View from "ol/View";
import Projection from "ol/proj/Projection";
import { get as getProjection } from "ol/proj";
import XYZ from "ol/source/XYZ";
import proj4 from "proj4";
import { register } from "ol/proj/proj4";
import TileGrid from "ol/tilegrid/TileGrid";
import { Vector as VectorSource } from "ol/source.js";
import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer.js";
import GeoJSON from "ol/format/GeoJSON.js";
import { getCenter } from "ol/extent";
import { Circle as CircleStyle, Stroke, Style } from "ol/style.js";
import { ZoomToExtent, FullScreen, defaults as defaultControls } from "ol/control.js";
import { styled } from "@mui/system";
import ReactDOM from "react-dom";
import React from "react";
import { FontAwesomeIcon, FontAwesomeIconProps } from "@fortawesome/react-fontawesome";

proj4.defs("EPSG:3067", "+proj=utm +zone=35 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs");
register(proj4);
const projection = getProjection("EPSG:3067") as Projection;
projection.setExtent([-548576, 6291456, 1548576, 8388608]);
const resolutions = [8192, 4096, 2048, 1024, 512, 256, 128, 64, 32, 16, 8, 4, 2, 1];

const geometry = {
  type: "GeometryCollection",
  geometries: [
    {
      coordinates: [24.946709845, 60.281074156, 0],
      type: "Point",
    },
    {
      coordinates: [
        [
          [24.941135584, 60.286788034, 0],
          [24.923089428, 60.277195592, 0],
          [24.960810069, 60.275666091, 0],
          [24.962870942, 60.286605186, 0],
          [24.941135584, 60.286788034, 0],
        ],
      ],
      type: "Polygon",
    },
    {
      coordinates: [24.974533512, 60.248207929, 0],
      type: "Point",
    },
    {
      coordinates: [
        [24.947414262, 60.236993502, 0],
        [24.948885908, 60.253806468, 0],
        [24.927998776, 60.268828283, 0],
        [24.973951208, 60.259000359, 0],
        [24.982643428, 60.293001333, 0],
      ],
      type: "LineString",
    },
  ],
};

const vectorSource = new VectorSource({
  features: [
    new GeoJSON({
      dataProjection: "EPSG:4326",
      featureProjection: "EPSG:3067",
    }).readFeature({
      type: "Feature",
      geometry,
    }),
  ],
});

const createIconSpan = (icon: FontAwesomeIconProps["icon"]) => {
  const element = document.createElement("span");
  ReactDOM.render(
    <React.StrictMode>
      <FontAwesomeIcon icon={icon} color="#0064af" />
    </React.StrictMode>,
    element
  );
  return element;
};

export function Kartta() {
  const mapElement = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  useEffect(() => {
    const extent = vectorSource.getExtent();
    if (!mapRef.current) {
      mapRef.current = new Map({
        controls: defaultControls({
          rotate: false,
          zoomOptions: { zoomInLabel: createIconSpan("plus"), zoomOutLabel: createIconSpan("minus") },
        }).extend([
          new ZoomToExtent({
            extent: extent,
            label: createIconSpan("map-marker-alt"),
          }),
          new FullScreen({ label: createIconSpan("expand-alt"), labelActive: createIconSpan("times") }),
        ]),
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
          new VectorLayer({
            source: vectorSource,
            opacity: 0.9,
            style: new Style({
              stroke: new Stroke({
                color: "#0064AF",
                width: 8,
              }),
              image: new CircleStyle({
                radius: 12,
                stroke: new Stroke({
                  color: "#0064AF",
                  width: 8,
                }),
              }),
            }),
          }),
        ],
        view: new View({
          projection,
          center: getCenter(extent),
          resolutions,
          resolution: 128,
          extent: [61000, 6605000, 733000, 7777000],
          constrainResolution: true,
        }),
      });
    }
    if (mapElement.current && mapRef.current) {
      mapRef.current.setTarget(mapElement.current);
      mapRef.current.getView().fit(extent);
    }
  }, []);

  return <StyledMap id="map" ref={mapElement} />;
}

const StyledMap = styled("div")({
  height: "300px",
  "& .ol-control button": {
    backgroundColor: "white",
    borderRadius: "4px",
    width: "32px",
    height: "32px",
    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.2), 0 2px 15px -3px rgb(0 0 0 / 0.2)",
    margin: "4px",
  },
});
