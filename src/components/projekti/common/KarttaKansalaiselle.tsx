import React, { useCallback, StrictMode, useEffect, useMemo, useRef, ComponentProps } from "react";
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
import { Options } from "ol/control/FullScreen";
import { styled } from "@mui/system";
import ReactDOM from "react-dom";
import { FontAwesomeIcon, FontAwesomeIconProps } from "@fortawesome/react-fontawesome";
import { defaults as defaultInteractions } from "ol/interaction";
import BaseLayer from "ol/layer/Base";
import { fromExtent as polygonFromExtent } from "ol/geom/Polygon.js";
import { useIsFullScreen } from "src/hooks/useIsFullScreen";
import useTranslation from "next-translate/useTranslation";
import FullScreenControl from "../../../map/FullScreenControl";
import { useIsBelowBreakpoint } from "src/hooks/useIsSize";

proj4.defs("EPSG:3067", "+proj=utm +zone=35 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs");
register(proj4);
const projection = getProjection("EPSG:3067") as Projection;
projection.setExtent([-548576, 6291456, 1548576, 8388608]);
const resolutions = [8192, 4096, 2048, 1024, 512, 256, 128, 64, 32, 16, 8, 4, 2, 1];

const BREAKPOINT = "md";

const IMAGE_CIRCLE_RADIUS = 10;
const STROKE_WIDTH = 8;

const createIconSpan = (icon: FontAwesomeIconProps["icon"]) => {
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
  view.fitInternal(polygonFromExtent(extent ?? view.getProjection().getExtent()));
}

type KarttaKansalaiselleProps = {
  geoJSON: string | null | undefined;
};

export function KarttaKansalaiselle({ geoJSON }: Readonly<KarttaKansalaiselleProps>) {
  const { t } = useTranslation("kartta");
  const vectorSource = useMemo(
    () =>
      geoJSON
        ? new VectorSource({
            features: [
              new GeoJSON({
                dataProjection: "EPSG:4326",
                featureProjection: "EPSG:3067",
              }).readFeature(geoJSON),
            ],
          })
        : undefined,
    [geoJSON]
  );

  const mapElement = useRef<HTMLDivElement | null>(null);

  const map = useMemo(() => {
    const extent = vectorSource?.getExtent();

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
        })
      );
    }

    return new Map({
      controls: defaultControls({
        rotate: false,
        zoomOptions: {
          zoomInLabel: createIconSpan("plus"),
          zoomOutLabel: createIconSpan("minus"),
          zoomInTipLabel: t("lahenna"),
          zoomOutTipLabel: t("loitonna"),
        },
      }).extend([
        new ZoomToExtent({
          extent: extent,
          label: createIconSpan("map-marker-alt"),
          tipLabel: t("kohdenna"),
        }),
        new FullScreenControl({
          label: createIconSpan("expand-alt"),
          labelActive: createIconSpan("times"),
          inactiveTipLabel: t("avaa-koko-nayton-tila"),
          activeTipLabel: t("sulje-koko-nayton-tila"),
        }),
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
  }, [map, vectorSource]);

  const isFullScreen = useIsFullScreen(mapElement.current);

  useEffect(() => {
    zoomToExtent(map, vectorSource?.getExtent());
  }, [isFullScreen, map, vectorSource]);

  const openMapFullScreen = useCallback(() => {
    mapElement.current?.requestFullscreen();
  }, []);

  const isMobile = useIsBelowBreakpoint(BREAKPOINT);

  const overlayProps: ComponentProps<typeof Overlay> = useMemo(() => {
    const overlayVisible = isMobile && !isFullScreen;
    return overlayVisible
      ? { isFullScreen, role: "button", title: t("avaa-koko-nayton-tila"), onClick: openMapFullScreen }
      : { isFullScreen };
  }, [isFullScreen, isMobile, openMapFullScreen, t]);

  return (
    <StyledMap id="map" isFullScreen={isFullScreen} locationalDataExists={!!geoJSON} ref={mapElement}>
      {geoJSON ? (
        <Overlay {...overlayProps}>
          <OverlayText>{t("kosketa-karttaa")}</OverlayText>
        </Overlay>
      ) : (
        <EiVoidaNayttaaOverlay>
          <EiVoidaNayttaaOverlayText>
            Projektia ei voida näyttää kartalla
            <br />
            Aseta geometriat Projektivelhossa kohdasta Projektin geometriat
          </EiVoidaNayttaaOverlayText>
        </EiVoidaNayttaaOverlay>
      )}
    </StyledMap>
  );
}

const OverlayText = styled("p")({
  backgroundColor: "rgb(216, 216, 216, 0.5)",
  position: "absolute",
  display: "block",
  width: "100%",
  bottom: 0,
  textAlign: "center",
  marginBottom: 0,
  userSelect: "none",
  padding: "5px",
});

const EiVoidaNayttaaOverlayText = styled("p")({
  textAlign: "center",
  padding: "10px",
  verticalAlign: "center",
  marginBottom: "70px",
  backgroundColor: "rgb(255, 255, 255, 0.5)",
  display: "block",
  width: "100%",
});

const Overlay = styled("div")<{ isFullScreen: boolean }>(({ theme, isFullScreen }) => ({
  display: "none",
  [theme.breakpoints.down(BREAKPOINT)]: {
    display: isFullScreen ? "none" : "flex",
    cursor: isFullScreen ? "initial" : "pointer",
    position: "absolute",
    inset: 0,
    zIndex: 1,
  },
}));

const EiVoidaNayttaaOverlay = styled("div")({
  display: "flex",
  cursor: "initial",
  position: "absolute",
  inset: 0,
  zIndex: 1,
  backgroundColor: "rgb(216, 216, 216, 0.5)",
  alignItems: "center",
});

const StyledMap = styled("div")<{ isFullScreen: boolean; locationalDataExists: boolean }>(
  ({ theme, isFullScreen, locationalDataExists }) => ({
    height: "325px",
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
      [theme.breakpoints.down(BREAKPOINT)]: {
        display: isFullScreen ? "inline-block" : "none",
      },
      "& > button": {
        width: "40px",
        height: "40px",
      },
      "&.ol-full-screen": {
        top: "16px",
        [theme.breakpoints.up(BREAKPOINT)]: {
          display: isFullScreen ? "inline-block" : "none",
        },
      },
      "&.ol-zoom-extent": {
        bottom: "126px",
      },
      "&.ol-zoom": {
        display: "flex",
        [theme.breakpoints.down(BREAKPOINT)]: {
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
