import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Extent, getCenter } from "ol/extent";
import { Circle as CircleStyle, Stroke, Style } from "ol/style.js";
import { ZoomToExtent, defaults as defaultControls } from "ol/control.js";
import FullScreen from "ol/control/FullScreen";
import { styled } from "@mui/system";
import ReactDOM from "react-dom";
import React from "react";
import { FontAwesomeIcon, FontAwesomeIconProps } from "@fortawesome/react-fontawesome";
import { defaults as defaultInteractions } from "ol/interaction";
import BaseLayer from "ol/layer/Base";
import { fromExtent as polygonFromExtent } from "ol/geom/Polygon.js";

proj4.defs("EPSG:3067", "+proj=utm +zone=35 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs");
register(proj4);
const projection = getProjection("EPSG:3067") as Projection;
projection.setExtent([-548576, 6291456, 1548576, 8388608]);
const resolutions = [8192, 4096, 2048, 1024, 512, 256, 128, 64, 32, 16, 8, 4, 2, 1];

const createIconSpan = (icon: FontAwesomeIconProps["icon"]) => {
  const element = document.createElement("span");
  ReactDOM.render(
    <React.StrictMode>
      <FontAwesomeIcon icon={icon} size="lg" color="#0064af" />
    </React.StrictMode>,
    element
  );
  return element;
};

function zoomToExtent(map: Map, extent?: Extent) {
  const view = map.getView();
  view.fitInternal(polygonFromExtent(extent || view.getProjection().getExtent()));
}

export function KarttaKansalaiselle({ geoJSON }: { geoJSON: string | null | undefined }) {
  const vectorSource = useMemo(
    () =>
      geoJSON
        ? new VectorSource({
            features: [
              new GeoJSON({
                dataProjection: "EPSG:4326",
                featureProjection: "EPSG:3067",
              }).readFeature({
                type: "Feature",
                geometry: JSON.parse(geoJSON),
              }),
            ],
          })
        : undefined,
    [geoJSON]
  );

  const mapElement = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const [isFullScreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const extent = vectorSource?.getExtent();
    if (!mapRef.current) {
      const layers: BaseLayer[] = [
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
      ];
      if (vectorSource) {
        layers.push(
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
          })
        );
      }
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
        layers,
        view: new View({
          projection,
          center: extent ? getCenter(extent) : getCenter([61000, 6605000, 733000, 7777000]),
          resolutions,
          resolution: 128,
          extent: [61000, 6605000, 733000, 7777000],
          constrainResolution: true,
        }),
        interactions: defaultInteractions(),
      });
    }

    if (mapElement.current && mapRef.current) {
      mapRef.current.setTarget(mapElement.current);
      zoomToExtent(mapRef.current, extent);
    }
  }, [vectorSource]);

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === mapElement.current);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    if (mapRef.current) {
      zoomToExtent(mapRef.current, vectorSource?.getExtent());
    }
  }, [isFullScreen, vectorSource]);

  const openMapFullScreen = useCallback(() => {
    if (geoJSON) {
      mapElement.current?.requestFullscreen();
    }
  }, [geoJSON]);

  return (
    <StyledMap id="map" isFullScreen={isFullScreen} locationalDataExists={!!geoJSON} ref={mapElement}>
      <Overlay locationalDataExists={!!geoJSON} isFullScreen={isFullScreen} onClick={openMapFullScreen}>
        {!geoJSON && (
          <OverlayText>
            Projektia ei voida näyttää kartalla
            <br />
            Muokkaa projektia ja aseta geometriat Velhossa kohdasta Projektin geometriat
          </OverlayText>
        )}
      </Overlay>
    </StyledMap>
  );
}

const OverlayText = styled("p")(({ theme }) => ({
  textAlign: "center",
  padding: theme.spacing(6),
  verticalAlign: "center",
  backgroundColor: "rgb(255, 255, 255, 0.5)",
  display: "block",
  width: "100%",
}));

const Overlay = styled("div")<{ isFullScreen: boolean; locationalDataExists: boolean }>(
  ({ theme, isFullScreen, locationalDataExists }) => ({
    display: locationalDataExists ? "none" : "flex",
    [theme.breakpoints.down("md")]: {
      display: isFullScreen ? "none" : "flex",
      cursor: isFullScreen ? "initial" : "pointer",
      position: "absolute",
      inset: 0,
      zIndex: 1,
    },
    ...(locationalDataExists
      ? {}
      : {
          cursor: "initial",
          position: "absolute",
          inset: 0,
          zIndex: 1,
          backgroundColor: "rgb(216, 216, 216, 0.5)",
          alignItems: "center",
        }),
  })
);

const StyledMap = styled("div")<{ isFullScreen: boolean; locationalDataExists: boolean }>(
  ({ theme, isFullScreen, locationalDataExists }) => ({
    height: "300px",
    zIndex: 0,
    position: "relative",
    "& .ol-control": {
      display: locationalDataExists ? "inline-block" : "none !important",
      backgroundColor: "white",
      position: "absolute",
      borderRadius: "4px",
      boxShadow: "0 4px 4px 1px rgb(0 0 0 / 0.2)",
      right: isFullScreen ? "8px" : "24px",
      margin: "4px",
      [theme.breakpoints.down("md")]: {
        display: isFullScreen ? "inline-block" : "none",
      },
      "& > button": {
        width: "40px",
        height: "40px",
      },
      "&.ol-full-screen": {
        top: "16px",
        [theme.breakpoints.up("md")]: {
          display: isFullScreen ? "inline-block" : "none",
        },
      },
      "&.ol-zoom-extent": {
        bottom: "126px",
      },
      "&.ol-zoom": {
        display: "flex",
        [theme.breakpoints.down("md")]: {
          display: isFullScreen ? "flex" : "none",
        },
        flexDirection: "column",
        "& > button": {
          height: "48px",
          "&.ol-zoom-out": {
            position: "relative",
            "&::before": {
              content: "''",
              position: "absolute",
              display: "block",
              top: "-0.5px",
              right: "3px",
              left: "3px",
              height: "1px",
              backgroundColor: "#D8D8D8",
            },
          },
        },
        bottom: "16px",
      },
    },
  })
);
