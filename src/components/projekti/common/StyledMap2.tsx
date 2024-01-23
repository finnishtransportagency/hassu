import { styled } from "@mui/system";
import { DetailedHTMLProps, HTMLAttributes, useRef, useEffect, useMemo } from "react";
import * as ReactDOMServer from "react-dom/server";

import Map from "ol/Map";
import View from "ol/View";
import Projection from "ol/proj/Projection";
import { get as getProjection } from "ol/proj";
import XYZ from "ol/source/XYZ";
import proj4 from "proj4";
import { register } from "ol/proj/proj4";
import TileGrid from "ol/tilegrid/TileGrid";
import { Vector as VectorSource } from "ol/source";
import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer";
import { Extent, getCenter } from "ol/extent";
import { Circle as CircleStyle, Stroke, Style } from "ol/style";
import { defaults as olDefaultControls } from "ol/control";
import { Options } from "ol/control/FullScreen";
import { FontAwesomeIcon, FontAwesomeIconProps } from "@fortawesome/react-fontawesome";
import BaseLayer from "ol/layer/Base";
import useTranslation from "next-translate/useTranslation";
import { useIsFullScreen } from "src/hooks/useIsFullScreen";
import { Translate } from "next-translate";
import Geometry from "ol/geom/Geometry";
import WKT from "ol/format/WKT";
import DrawControl, { createDrawToolInteractions, DrawToolInteractions } from "src/map/DrawControl";
import GeoJSON from "ol/format/GeoJSON";
import { defaults as defaultInteractions } from "ol/interaction";
import GeoJsonFileInputControl from "src/map/GeoJsonFileInputControl";
import useSnackbars from "src/hooks/useSnackbars";
import { ShowMessage } from "@components/HassuSnackbarProvider";
import { zoomToExtent } from "src/map/zoomToExtent";
import ZoomToSourceExtent from "src/map/ZoomToSourceExtent";
import TallennaControl from "src/map/TallennaControl";
import useApi from "src/hooks/useApi";
import { API } from "@services/api/commonApi";
import { ProjektiLisatiedolla } from "common/ProjektiValidationContext";
import axios from "axios";
import VectorTileLayer from "ol/layer/VectorTile";
import VectorTileSource from "ol/source/VectorTile";
import MVT from "ol/format/MVT";
import { stylefunction } from "ol-mapbox-style";
import VectorLayer2 from "ol/layer/Vector";
import featuresStyle from "./featuresStyle.json";
import debounce from "lodash/debounce";
import { getUid } from "ol/util";
import InfoControl from "src/map/KiinteistoInfoControl";

const mapOpts = {
  dataProj: "EPSG:3067",
  viewProj: "EPSG:3067",
  dataCrs: "http://www.opengis.net/def/crs/EPSG/0/3067",
};

const wkt = new WKT();

proj4.defs("EPSG:3067", "+proj=utm +zone=35 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs");
register(proj4);
const projection = getProjection("EPSG:3067") as Projection;
const projectionExtent: Extent = [-548576, 6291456, 1548576, 8388608];
projection.setExtent(projectionExtent);
const resolutions = [8192, 4096, 2048, 1024, 512, 256, 128, 64, 32, 16, 8, 4, 2, 1];

export const IMAGE_CIRCLE_RADIUS = 10;
export const STROKE_WIDTH = 8;

export const createElement = (children: JSX.Element) => {
  const element = document.createElement("span");
  const content = ReactDOMServer.renderToStaticMarkup(children);
  element.innerHTML = content;
  return element;
};

export const createIconSpan = (icon: FontAwesomeIconProps["icon"]) =>
  createElement(<FontAwesomeIcon icon={icon} size="lg" color="#0064af" />);

export type CustomOptions = Options & { activeTipLabel?: string; inactiveTipLabel?: string };

type StyledMapProps = DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement> & {
  projekti: ProjektiLisatiedolla;
  geoJSON: string | null | undefined;
};

export const StyledMap2 = styled(({ children, projekti, geoJSON, ...props }: StyledMapProps) => {
  const api = useApi();
  const { showErrorMessage, showSuccessMessage } = useSnackbars();

  const { t } = useTranslation("kartta");
  const mapElement = useRef<HTMLDivElement | null>(null);

  const vectorSource: VectorSource<Geometry> = useMemo(() => new VectorSource(), []);

  const map = useMemo(() => {
    const extent = vectorSource.isEmpty() ? undefined : vectorSource.getExtent();

    const tileGrid = new TileGrid({
      extent: projectionExtent,
      resolutions,
      tileSize: [256, 256],
    });

    const selectionLayer = createVectorLayer(vectorSource);

    const geoJsonSource = new VectorSource({
      format: new GeoJSON({
        dataProjection: projection,
      }),
    });

    const loadGeometries: (geom: Geometry) => Promise<void> = async (geom) => {
      const geomUid = getUid(geom);
      const tgeom = geomViewToData(geom.clone()),
        s_geom_wkt = wkt.writeGeometry(tgeom),
        s_filter = `S_INTERSECTS(geometry,${s_geom_wkt})`;

      const params = {
        limit: "1000",
        "filter-lang": "cql2-text",
        filter: s_filter,
        crs: mapOpts.dataCrs,
        "bbox-crs": mapOpts.dataCrs,
        "filter-crs": mapOpts.dataCrs,
      };

      const baseUrl = "https://avoin-paikkatieto.maanmittauslaitos.fi/kiinteisto-avoin/simple-features/v3";
      const featType = "PalstanSijaintitiedot";
      const response = await axios.get(`${baseUrl}/collections/${featType}/items`, { params });

      const feats = format.readFeatures(response.data);

      geoJsonSource
        .getFeatures()
        .filter((feat) => feat.getProperties().selectedGeometryUid === geomUid)
        .forEach((feat) => {
          geoJsonSource.removeFeature(feat);
        });

      feats.forEach((f) => {
        f.setProperties({ featureType: featType, selectedGeometryUid: getUid(geom) });
      });

      geoJsonSource.addFeatures(feats);
    };

    vectorSource.on("addfeature", (event) => {
      event.feature?.getGeometry();
      const debouncedLoadGeometries = debounce(() => {
        const geometry = event.feature?.getGeometry();
        if (geometry) {
          loadGeometries(geometry);
        }
      }, 500);
      event.feature?.getGeometry()?.on("change", debouncedLoadGeometries);
      const geometry = event.feature?.getGeometry();
      if (geometry) {
        loadGeometries(geometry);
      }
    });

    vectorSource.on("removefeature", (event) => {
      const uid = getUid(event.feature?.getGeometry());
      geoJsonSource
        .getFeatures()
        .filter((feat) => uid === feat.getProperties().selectedGeometryUid)
        .forEach((feat) => {
          geoJsonSource.removeFeature(feat);
        });
    });

    const layers = [createTileLayer(tileGrid), createVectorTileLayer(tileGrid), createGeoJsonVectorLayer(geoJsonSource), selectionLayer];
    const drawToolInteractions = createDrawToolInteractions(selectionLayer, vectorSource);
    const interactions = [
      drawToolInteractions.MODIFY,
      ...Object.values(drawToolInteractions.DRAW),
      drawToolInteractions.SELECT,
      drawToolInteractions.SNAP,
    ];
    return new Map({
      controls: defaultControls({
        t,
        selectionSource: vectorSource,
        geoJsonSource: geoJsonSource,
        interactions: drawToolInteractions,
        showErrorMessage,
        showSuccessMessage,
        api,
        oid: projekti.oid,
      }),
      layers,
      view: defaultView(extent),
      interactions: defaultInteractions().extend(interactions),
    });
  }, [api, projekti.oid, showErrorMessage, showSuccessMessage, t, vectorSource]);

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
    vectorSource.clear();
    if (geoJSON) {
      try {
        vectorSource.addFeatures(new GeoJSON().readFeatures(geoJSON));
        zoomToExtent(map, vectorSource?.getExtent());
      } catch {
        showErrorMessage("Karttarajauksen lisääminen epäonnistui");
      }
    }
  }, [geoJSON, map, showErrorMessage, vectorSource]);

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
    right: "24px",
    "& > button": {
      backgroundColor: "white",
      borderRadius: "4px",
      boxShadow: "0 4px 4px 1px rgb(0 0 0 / 0.2)",
      margin: "4px",
      width: "40px",
      height: "40px",
      "&:disabled": {
        backgroundColor: "gray",
      },
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
      backgroundColor: "white",
      borderRadius: "4px",
      boxShadow: "0 4px 4px 1px rgb(0 0 0 / 0.2)",
      margin: "4px",
      "& > button": {
        height: "48px",
        borderRadius: "0px",
        boxShadow: "none",
        margin: "0px",
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
      pointerEvents: "none !important",
      gap: "4px",
      "& > button": {
        pointerEvents: "auto",
        "&.draw-active": {
          backgroundColor: "green",
        },
      },
    },
    "&.ol-geo-json": {
      top: "24px",
      left: "24px",
      right: "unset",
    },
    "&.ol-save-as-geo-json": {
      bottom: "24px",
      right: "100px",
    },
    "&.ol-kiinteisto-info": {
      backgroundColor: "gray",
    },
  },
});

const format = new GeoJSON({
  featureProjection: "EPSG:3067",
  dataProjection: "EPSG:3067",
});

function geomViewToData(geom: any) {
  if (mapOpts.viewProj == mapOpts.dataProj) {
    return geom;
  }
  return geom.transform(mapOpts.viewProj, mapOpts.dataProj);
}

export function createGeoJsonVectorLayer(geoJsonSource: VectorSource<Geometry>) {
  const layer = new VectorLayer2({
    declutter: true,
    source: geoJsonSource,
    opacity: 1,
    minZoom: 1,
    maxZoom: 15,
  });

  const layers = [
    "KunnanRekisterinpitoalueenSijaintitiedot_style",
    "ProjisoidunPalstanSijaintitiedot_style",
    "PalstanSijaintitiedot_style",
    "PalstanSijaintitiedot_boundarystyle",
    "KayttooikeusyksikonOsanSijaintitiedot_style_polygon",
    "KayttooikeusyksikonOsanSijaintitiedot_style_viiva",
    "KayttooikeusyksikonOsanSijaintitiedot_tunnus",
    "KiinteistorajanSijaintitiedot",
    "RajamerkinSijaintitiedot",
    "RajamerkinSijaintitiedot_tunnus",
    "KiinteistotunnuksenSijaintitiedot",
    "ProjisoidunPalstanKiinteistotunnuksenSijaintitiedot",
    "MaaraalanOsanSijaintitiedot_style_polygon",
    "MaaraalanOsanSijaintitiedot_tunnus",
  ];

  stylefunction(layer, featuresStyle, layers, resolutions);
  return layer;
}

export function createTileLayer(tileGrid: TileGrid): BaseLayer {
  return new TileLayer({
    source: new XYZ({
      projection,
      tileGrid,
      urls: ["/hassu/karttakuva/avoin/wmts/1.0.0/taustakartta/default/ETRS-TM35FIN/{z}/{y}/{x}.png"],
    }),
  });
}

export function createVectorTileLayer(tileGrid: TileGrid): BaseLayer {
  const layer = new VectorTileLayer({
    declutter: true,
    source: new VectorTileSource({
      projection: projection,
      tileGrid,
      format: new MVT(),
      minZoom: 9,
      maxZoom: 15,
      url: "/hassu/karttakuva/kiinteisto-avoin/tiles/wmts/1.0.0/kiinteistojaotus/default/v3/ETRS-TM35FIN/{z}/{y}/{x}.pbf",
    }),
    opacity: 1,
    minZoom: 9,
    maxZoom: 15,
  });

  const layers = ["vt_KiinteistorajanSijaintitiedot", "vt_RajamerkinSijaintitiedot", "vt_RajamerkinSijaintitiedot_tunnus"];

  stylefunction(layer, featuresStyle, layers, resolutions);
  return layer;
}

export function createVectorLayer(source: VectorSource<Geometry>): VectorLayer<VectorSource<Geometry>> {
  return new VectorLayer({
    source,
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

type DefaultControlProps = {
  t: Translate;
  selectionSource: VectorSource<Geometry>;
  geoJsonSource: VectorSource<Geometry>;
  interactions: DrawToolInteractions;
  showErrorMessage: ShowMessage;
  showSuccessMessage: ShowMessage;
  api: API;
  oid: string;
};

export function defaultControls({
  t,
  geoJsonSource,
  selectionSource: source,
  interactions,
  showErrorMessage,
  showSuccessMessage,
  api,
  oid,
}: DefaultControlProps) {
  return olDefaultControls({
    rotate: false,
    zoomOptions: {
      zoomInLabel: createIconSpan("plus"),
      zoomOutLabel: createIconSpan("minus"),
      zoomInTipLabel: t("lahenna"),
      zoomOutTipLabel: t("loitonna"),
    },
  }).extend([
    new ZoomToSourceExtent({
      source,
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
    new GeoJsonFileInputControl({ source, showErrorMessage, showSuccessMessage }),
    new TallennaControl({ source, showErrorMessage, showSuccessMessage, api, oid }),
    new InfoControl({ geoJsonSource }),
  ]);
}
