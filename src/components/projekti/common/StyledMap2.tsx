import { styled } from "@mui/system";
import { DetailedHTMLProps, HTMLAttributes, useRef } from "react";

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
import { Extent, getCenter, isEmpty } from "ol/extent";
import { Circle as CircleStyle, Stroke, Style } from "ol/style.js";
import { ZoomToExtent, defaults as olDefaultControls } from "ol/control.js";
import { Options } from "ol/control/FullScreen";
import ReactDOM from "react-dom";
import { FontAwesomeIcon, FontAwesomeIconProps } from "@fortawesome/react-fontawesome";
import BaseLayer from "ol/layer/Base";
import { fromExtent as polygonFromExtent } from "ol/geom/Polygon.js";
import { StrictMode, useEffect, useMemo } from "react";
import useTranslation from "next-translate/useTranslation";
import { useIsFullScreen } from "src/hooks/useIsFullScreen";
import { Translate } from "next-translate";
import Geometry from "ol/geom/Geometry";
import DrawControl, { createDrawToolInteractions, DrawToolInteractions } from "src/map/DrawControl";
import GeoJSON from "ol/format/GeoJSON";
import * as geozi from "src/components/projekti/common/some.json";
import { defaults as defaultInteractions } from "ol/interaction";

proj4.defs("EPSG:3067", "+proj=utm +zone=35 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs");
register(proj4);
const projection = getProjection("EPSG:3067") as Projection;
projection.setExtent([-548576, 6291456, 1548576, 8388608]);
const resolutions = [8192, 4096, 2048, 1024, 512, 256, 128, 64, 32, 16, 8, 4, 2, 1];

export const IMAGE_CIRCLE_RADIUS = 10;
export const STROKE_WIDTH = 8;

export const createIconSpan = (icon: FontAwesomeIconProps["icon"]) => {
  const element = document.createElement("span");
  ReactDOM.render(
    <StrictMode>
      <FontAwesomeIcon icon={icon} size="lg" color="#0064af" />
    </StrictMode>,
    element
  );
  return element;
};

export type CustomOptions = Options & { activeTipLabel?: string; inactiveTipLabel?: string };

function zoomToExtent(map: Map, extent?: Extent) {
  const view = map.getView();
  const extentToFit = extent ?? view.getProjection().getExtent();
  if (!isEmpty(extentToFit)) {
    view.fitInternal(polygonFromExtent(extentToFit));
  }
}

type StyledMapProps = DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>;

export const StyledMap2 = styled(({ children, ...props }: StyledMapProps) => {
  const vectorSource = useMemo(
    () =>
      new VectorSource({
        features: [
          new GeoJSON({
            dataProjection: "EPSG:4326",
            featureProjection: "EPSG:3067",
          }).readFeature(geozi),
        ],
      }),
    []
  );
  const { t } = useTranslation("kartta");
  const mapElement = useRef<HTMLDivElement | null>(null);
  const map = useMemo(() => {
    const extent = vectorSource?.getExtent();
    const drawToolInteractions = createDrawToolInteractions(vectorSource);
    const interactions = [
      drawToolInteractions.MODIFY,
      ...Object.values(drawToolInteractions.DRAW),
      drawToolInteractions.SELECT,
      drawToolInteractions.SNAP,
    ];
    return new Map({
      controls: defaultControls(t, vectorSource, drawToolInteractions),
      layers: defaultLayers(vectorSource),
      view: defaultView(extent),
      interactions: defaultInteractions().extend(interactions),
    });
  }, [t, vectorSource]);

  useEffect(() => {
    const extent = vectorSource?.getExtent();
    if (mapElement.current && map) {
      map.setTarget(mapElement.current);
      zoomToExtent(map, extent);
    }
    return () => {
      map.setTarget();
    };
  }, [map, mapElement, vectorSource]);

  const isFullScreen = useIsFullScreen(mapElement.current);

  useEffect(() => {
    zoomToExtent(map, vectorSource?.getExtent());
  }, [isFullScreen, map, vectorSource]);

  return (
    <div {...props} ref={mapElement}>
      {children}
    </div>
  );
})({
  height: "100%",
  zIndex: 0,
  position: "relative",
  "& .ol-control": {
    display: "inline-block",
    position: "absolute",
    borderRadius: "4px",
    right: "24px",
    backgroundColor: "white",
    boxShadow: "0 4px 4px 1px rgb(0 0 0 / 0.2)",
    margin: "4px",
    "& > button": {
      width: "40px",
      height: "40px",
    },
    "&.ol-full-screen": {
      top: "16px",
    },
    "&.ol-zoom-extent": {
      bottom: "126px",
    },
    "&.ol-zoom": {
      display: "flex",
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
    "&.ol-draw": {
      display: "flex",
      top: "24px",
      backgroundColor: "transparent",
      boxShadow: "none",
      pointerEvents: "none !important",
      gap: "8px",
      "& > button": {
        pointerEvents: "auto",
        backgroundColor: "white",
        borderRadius: "4px",
        boxShadow: "0 4px 4px 1px rgb(0 0 0 / 0.2)",
        "&.draw-active": {
          backgroundColor: "green",
        },
        "&:disabled": {
          backgroundColor: "gray",
        },
      },
    },
  },
});

export function defaultLayers(vectorSource: VectorSource<Geometry> | undefined) {
  const layers: BaseLayer[] = [createTileLayer()];
  if (vectorSource) {
    layers.push(createVectorLayer(vectorSource));
  }
  return layers;
}

export function createTileLayer(): BaseLayer {
  return new TileLayer({
    source: new XYZ({
      projection: projection,
      tileGrid: new TileGrid({
        resolutions,
        tileSize: [256, 256],
        extent: [-548576, 6291456, 1548576, 8388608],
      }),
      urls: ["/hassu/karttakuva/avoin/wmts/1.0.0/taustakartta/default/ETRS-TM35FIN/{z}/{y}/{x}.png"],
    }),
  });
}

export function createVectorLayer(vectorSource: VectorSource<Geometry>): VectorLayer<VectorSource<Geometry>> {
  return new VectorLayer({
    source: vectorSource,
    opacity: 0.9,
    style: new Style({
      stroke: new Stroke({
        color: "#0064AF",
        width: STROKE_WIDTH,
      }),
      image: new CircleStyle({
        radius: IMAGE_CIRCLE_RADIUS,
        stroke: new Stroke({
          color: "#0064AF",
          width: STROKE_WIDTH,
        }),
      }),
    }),
  });
}

export function defaultView(extent: Extent | undefined) {
  return new View({
    projection,
    center: extent ? getCenter(extent) : getCenter([61000, 6605000, 733000, 7777000]),
    resolutions,
    resolution: 128,
    extent: [61000, 6605000, 733000, 7777000],
    constrainResolution: true,
  });
}

export function defaultControls(t: Translate, source: VectorSource<Geometry>, interactions: DrawToolInteractions) {
  return olDefaultControls({
    rotate: false,
    zoomOptions: {
      zoomInLabel: createIconSpan("plus"),
      zoomOutLabel: createIconSpan("minus"),
      zoomInTipLabel: t("lahenna"),
      zoomOutTipLabel: t("loitonna"),
    },
  }).extend([
    new ZoomToExtent({
      extent: source.getExtent(),
      label: createIconSpan("map-marker-alt"),
      tipLabel: t("kohdenna"),
    }),
    new DrawControl({
      interactions,
      source,
      drawStringLine: { label: createIconSpan("slash"), tipLabel: t("lahenna") },
      drawPolygon: { label: createIconSpan("draw-polygon"), tipLabel: t("lahenna") },
      drawBox: { label: createIconSpan("square"), tipLabel: t("lahenna") },
      undo: { label: createIconSpan("undo"), tipLabel: t("lahenna") },
      removeFeature: { label: createIconSpan("minus"), tipLabel: t("lahenna") },
      clear: { label: createIconSpan("trash"), tipLabel: t("lahenna") },
    }),
  ]);
}
