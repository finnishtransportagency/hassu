import { styled } from "@mui/system";
import { DetailedHTMLProps, HTMLAttributes, useRef, useEffect, useMemo, useState, useCallback } from "react";
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
import { Zoom } from "ol/control";
import { Options } from "ol/control/FullScreen";
import { FontAwesomeIcon, FontAwesomeIconProps } from "@fortawesome/react-fontawesome";
import BaseLayer from "ol/layer/Base";
import useTranslation from "next-translate/useTranslation";
import { useIsFullScreen } from "src/hooks/useIsFullScreen";
import { Translate } from "next-translate";
import Geometry from "ol/geom/Geometry";
import DrawControl, { createDrawToolInteractions, DrawToolInteractions } from "src/map/control/DrawControl";
import GeoJSON from "ol/format/GeoJSON";
import { defaults as defaultInteractions } from "ol/interaction";
import ReadFeaturesFromGeoJsonFileInputControl, {
  ReadFeaturesFromGeoJsonFileInputControlOptions,
} from "src/map/control/ReadFeaturesFromGeoJsonFileInputControl";
import useSnackbars from "src/hooks/useSnackbars";
import { ShowMessage } from "@components/HassuSnackbarProvider";
import { zoomToExtent } from "src/map/util/zoomToExtent";
import ZoomToSourceExtent from "src/map/control/ZoomToSourceExtent";
import SaveGeoJsonControl from "src/map/control/SaveGeoJsonControl";
import { setLoadingStateForControls } from "src/map/control/loadingStateForControls";
import useApi from "src/hooks/useApi";
import { ProjektiLisatiedolla } from "common/ProjektiValidationContext";
import axios from "axios";
import VectorTileLayer from "ol/layer/VectorTile";
import VectorTileSource from "ol/source/VectorTile";
import MVT from "ol/format/MVT";
import { stylefunction } from "ol-mapbox-style";
import VectorLayer2 from "ol/layer/Vector";
import featuresStyle from "src/map/style/featuresStyle.json";
import debounce from "lodash/debounce";
import { getUid } from "ol/util";
import InfoControl from "src/map/control/KiinteistoInfoControl";
import intersect from "@turf/intersect";
import { lineString, lineStringToPolygon, multiPolygon, polygon } from "@turf/turf";
import { MultiPolygon, Polygon, LineString } from "ol/geom";
import Feature from "ol/Feature";
import uniqBy from "lodash/uniqBy";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import { getArea } from "ol/sphere";
import { UnsupportedGeometryTypeError } from "src/map/exception/UnsupportedGeometryTypeError";
import { GeometryExceedsAreaLimitError } from "src/map/exception/GeometryExceedsAreaLimitError";
import { splitExtentInSmallerChunks } from "../../../map/util/splitExtentInSmallerChunks";
import { getKiinteistotunnuksetFromSource } from "src/map/util/getKiinteistotunnuksetFromSource";
import { VectorSourceEvent } from "ol/source/Vector";
import Button from "@components/button/Button";
import Collection from "ol/Collection";
import { MonikulmioIkoni } from "src/svg/MonikulmioIkoni";
import { SuorakulmioIkoni } from "src/svg/SuorakulmioIkoni";
import { KumoaIkoni } from "src/svg/KumoaIkoni";
import { OmistajahakuTila } from "@services/api";
import { useProjektinTiedottaminen } from "src/hooks/useProjektinTiedottaminen";

export const EPSG_3067 = "EPSG:3067";
const DATA_PROJ = EPSG_3067;
const VIEW_PROJ = EPSG_3067;
const DATA_CRS = "http://www.opengis.net/def/crs/EPSG/0/3067"; //NOSONAR

proj4.defs(EPSG_3067, "+proj=utm +zone=35 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs");
register(proj4);
const projection = getProjection(EPSG_3067) as Projection;
const projectionExtent: Extent = [-548576, 6291456, 1548576, 8388608];
projection.setExtent(projectionExtent);
const resolutions = [8192, 4096, 2048, 1024, 512, 256, 128, 64, 32, 16, 8, 4, 2, 1];

const tileGrid = new TileGrid({
  extent: projectionExtent,
  resolutions,
  tileSize: [256, 256],
});

const view = new View({
  projection,
  center: getCenter([61000, 6605000, 733000, 7777000]),
  resolutions,
  resolution: 128,
  extent: [61000, 6605000, 733000, 7777000],
  constrainResolution: true,
});

export const IMAGE_CIRCLE_RADIUS = 10;
export const STROKE_WIDTH = 8;

const FEAT_TYPE = "PalstanSijaintitiedot";

export const createElement = <K extends keyof HTMLElementTagNameMap>(
  children: JSX.Element,
  parentElementType: K
): HTMLElementTagNameMap[K] => {
  const element = document.createElement(parentElementType);
  element.innerHTML = ReactDOMServer.renderToStaticMarkup(children);
  return element;
};

export const createIconSpan = (icon: FontAwesomeIconProps["icon"]) =>
  createElement(<FontAwesomeIcon icon={icon} size="lg" color="#0064af" />, "span");

export type CustomOptions = Options & { activeTipLabel?: string; inactiveTipLabel?: string };

type StyledMapProps = DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement> & {
  projekti: ProjektiLisatiedolla;
  closeDialog: (isMapEdited: boolean) => void;
};

export const KiinteistonomistajaTiedottaminenMap = styled(({ children, projekti, closeDialog, ...props }: StyledMapProps) => {
  const isMapEditedByUserRef = useRef(false);
  const triggerMapEditedByUser = useCallback(() => {
    isMapEditedByUserRef.current = true;
  }, []);
  const clearMapEditedByUser = useCallback(() => {
    isMapEditedByUserRef.current = false;
  }, []);

  const api = useApi();
  const { showErrorMessage, showSuccessMessage } = useSnackbars();
  const { isLoading, withLoadingSpinner } = useLoadingSpinner();

  const { mutate } = useProjektinTiedottaminen();

  const [geoJSON, setGeoJSON] = useState<string | null>(null);

  useEffect(() => {
    const updateGeoJson = async () => {
      try {
        const response = await axios.get(`/yllapito/tiedostot/projekti/${projekti.oid}/karttarajaus/karttarajaus.geojson`, {
          responseType: "blob",
          headers: { "Cache-Control": "no-cache", Pragma: "no-cache", Expires: "0" },
        });

        if (!(response.data instanceof Blob)) {
          showErrorMessage("Karttarajaamisen lataaminen epäonnistui");
          return;
        }
        const text = await response.data.text();
        setGeoJSON(text);
      } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status === 404) {
          // Ei tehdä mitään. Karttarajaustiedostoa ei toistaiseksi ole
        } else {
          console.log(e);
          showErrorMessage("Karttarajaamisen lataaminen epäonnistui");
        }
      }
    };
    updateGeoJson();
  }, [projekti.oid, showErrorMessage]);

  const { t } = useTranslation("kartta");
  const mapElement = useRef<HTMLDivElement | null>(null);

  const vectorSource = useMemo(() => new VectorSource(), []);

  const map = useMemo(() => {
    const selectionLayer = createVectorLayer(vectorSource);

    const geoJsonSource = new VectorSource({
      format,
    });

    vectorSource.on("addfeature", getAddFeatureHandler(withLoadingSpinner, geoJsonSource, showErrorMessage));

    vectorSource.on("removefeature", getRemoveFeatureHandler(geoJsonSource, triggerMapEditedByUser));

    const layers = [createTileLayer(), createVectorTileLayer(), createGeoJsonVectorLayer(geoJsonSource), selectionLayer];
    const drawToolInteractions = createDrawToolInteractions(selectionLayer, vectorSource);
    const modify = drawToolInteractions.MODIFY;
    modify.on("modifystart", () => {
      triggerMapEditedByUser();
    });
    const drawInteractions = Object.values(drawToolInteractions.DRAW);
    drawInteractions.forEach((int) =>
      int.on("drawend", () => {
        triggerMapEditedByUser();
      })
    );
    const interactions = [modify, ...drawInteractions, drawToolInteractions.SELECT, drawToolInteractions.SNAP];

    const map = new Map({
      controls: getControls({
        t,
        view,
        selectionSource: vectorSource,
        geoJsonSource: geoJsonSource,
        interactions: drawToolInteractions,
        showErrorMessage,
        showSuccessMessage,
        handleSave: () => {
          withLoadingSpinner(
            (async () => {
              try {
                const geoJSON = JSON.stringify(format.writeFeaturesObject(vectorSource.getFeatures()));
                await api.tuoKarttarajaus(projekti.oid, geoJSON);
                clearMapEditedByUser();
                showSuccessMessage("Karttarajaus tallennettu");
              } catch (e) {
                console.log(e);
                showErrorMessage("Karttarajauksen tallentaminen epäonnistui");
              }
            })()
          );
        },
        handleSaveAndSearch: () => {
          withLoadingSpinner(
            (async () => {
              try {
                const geoJSON = JSON.stringify(format.writeFeaturesObject(vectorSource.getFeatures()));
                const kiinteistoTunnukset = Array.from(getKiinteistotunnuksetFromSource(geoJsonSource));
                await api.tuoKarttarajausJaTallennaKiinteistotunnukset(projekti.oid, geoJSON, kiinteistoTunnukset, projekti.status);
                clearMapEditedByUser();
                showSuccessMessage("Karttarajaus tallennettu. Kiinteistönomistajatietoja haetaan.");
                closeDialog(isMapEditedByUserRef.current);
                mutate((old) => {
                  if (!old) {
                    return null;
                  }
                  return {
                    ...old,
                    omistajahakuTila: OmistajahakuTila.KAYNNISSA,
                    omistajahakuKiinteistotunnusMaara: kiinteistoTunnukset.length,
                  };
                });
              } catch {
                showErrorMessage("Karttajarajauksen tallentaminen ja hakeminen epäonnistui");
              }
            })()
          );
        },
        handleExit: () => closeDialog(isMapEditedByUserRef.current),
      }),

      layers,
      view,
      interactions: defaultInteractions().extend(interactions),
    });
    map.on("pointermove", function (e) {
      const pixel = map.getEventPixel(e.originalEvent);
      const hit = map.hasFeatureAtPixel(pixel, { layerFilter: (layer) => layer === selectionLayer, hitTolerance: 10 });
      map.getViewport().style.cursor = hit ? "pointer" : "";
    });
    return map;
  }, [
    api,
    clearMapEditedByUser,
    closeDialog,
    mutate,
    projekti.oid,
    showErrorMessage,
    showSuccessMessage,
    t,
    triggerMapEditedByUser,
    vectorSource,
    withLoadingSpinner,
    projekti.status,
  ]);

  useEffect(() => {
    setLoadingStateForControls(map, isLoading);
  }, [isLoading, map]);

  useEffect(() => {
    const extent = vectorSource?.getExtent();
    if (mapElement.current && map) {
      map.setTarget(mapElement.current);
      zoomToExtent(view, extent);
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
        vectorSource.addFeatures(format.readFeatures(geoJSON));
        zoomToExtent(view, vectorSource?.getExtent());
      } catch {
        showErrorMessage("Karttarajauksen lisääminen epäonnistui");
      }
    }
  }, [geoJSON, showErrorMessage, vectorSource]);

  useEffect(() => {
    zoomToExtent(view, vectorSource?.getExtent());
  }, [isFullScreen, vectorSource]);

  return (
    <div {...props} id="kiinteiston-omistaja-map" ref={mapElement}>
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
    "& > button:not(.btn,.btn-primary)": {
      backgroundColor: "white",
      borderRadius: "4px",
      boxShadow: "0 4px 4px 1px rgb(0 0 0 / 0.2)",
      width: "40px",
      height: "40px",
      "& svg": {
        color: "#0063AF",
      },
      "&:disabled": {
        backgroundColor: "#E5E5E5",
        "& svg": {
          color: "#999999",
        },
      },
    },
    "&.ol-full-screen": {
      top: "16px",
    },
    "&.ol-zoom-extent": {
      bottom: "134px",
    },
    "&.ol-zoom": {
      display: "flex",
      flexDirection: "column",
      backgroundColor: "white",
      boxShadow: "0 4px 4px 1px rgb(0 0 0 / 0.2)",
      borderRadius: "4px",
      "& > button": {
        borderRadius: "4px",
        height: "48px",
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
      bottom: "24px",
    },
    "&.ol-draw": {
      display: "flex",
      top: "24px",
      backgroundColor: "transparent",
      pointerEvents: "none !important",
      gap: "10px",
      "& > button": {
        pointerEvents: "auto",
        "&.draw-active": {
          backgroundColor: "#0064AF",
          "& svg": {
            color: "#FFFFFF",
          },
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
      display: "flex",
      gap: "10px",
    },
    "&.ol-kiinteisto-info": {
      backgroundColor: "#F8F8F8",
      border: "1px solid #999999",
      bottom: "24px",
      paddingTop: "2px",
      paddingBottom: "2px",
      paddingRight: "16px",
      paddingLeft: "16px",
      right: "700px",
    },
  },
});

const format = new GeoJSON({
  featureProjection: projection,
  dataProjection: projection,
});

const PAIKKATIETO_BASEURL = "/hassu/paikkatieto/kiinteisto-avoin/simple-features/v3";

const fetchPalstanSijaintitiedot: (extent: Extent) => Promise<Feature<Geometry>[]> = async ([minX, minY, maxX, maxY]) => {
  let params: URLSearchParams | null = new URLSearchParams({
    limit: "1000",
    bbox: [minX, minY, maxX, maxY].join(","),
    "filter-lang": "cql2-text",
    crs: DATA_CRS,
    "bbox-crs": DATA_CRS,
  });

  const features: Feature<Geometry>[] = [];

  do {
    const response = await axios.get(`${PAIKKATIETO_BASEURL}/collections/${FEAT_TYPE}/items`, {
      params,
    });
    features.push(...format.readFeatures(response.data));
    const href: string = response.data.links.find((link: any) => link.rel === "next")?.href;
    params = href ? new URLSearchParams(new URL(href).search) : null;
  } while (params);

  return features;
};

function getRemoveFeatureHandler(
  geoJsonSource: VectorSource<Geometry>,
  triggerMapEditedByUser: () => void
): (event: VectorSourceEvent<Geometry>) => unknown {
  return (event) => {
    const uid = getUid(event.feature?.getGeometry());
    triggerMapEditedByUser();
    geoJsonSource
      .getFeatures()
      .filter((feat) => uid === feat.getProperties().selectedGeometryUid)
      .forEach((feat) => {
        geoJsonSource.removeFeature(feat);
      });
  };
}

function getAddFeatureHandler(
  withLoadingSpinner: <T>(promise: Promise<T>) => Promise<T>,
  geoJsonSource: VectorSource<Geometry>,
  showErrorMessage: ShowMessage
) {
  return (event: VectorSourceEvent<Geometry>) => {
    const handleAddFeature = () =>
      withLoadingSpinner(
        (async () => {
          const geometry = event.feature?.getGeometry();
          try {
            if (validateSelection(geometry)) {
              await loadGeometries(geoJsonSource, geometry);
            }
          } catch (e) {
            if (e instanceof UnsupportedGeometryTypeError) {
              showErrorMessage("Lisätty ei tuettu geometriatyyppi. Tuetut geometriatyypit: Polygon, MultiPolygon ja LineString");
            } else if (e instanceof GeometryExceedsAreaLimitError) {
              showErrorMessage("Rajaus on liian suuri. Tee pienempi rajaus.");
            } else {
              showErrorMessage("Kiinteistötietojen hakeminen epäonnistui.");
            }
          }
        })()
      );
    const debouncedLoadGeometries = debounce(handleAddFeature, 500);
    event.feature?.getGeometry()?.on("change", debouncedLoadGeometries);
    handleAddFeature();
  };
}

async function loadGeometries(geoJsonSource: VectorSource<Geometry>, geom: Polygon | MultiPolygon): Promise<void> {
  const geomUid = getUid(geom);

  const chunkSquareSideLength = 1400;
  const interceptingExtentChunks = splitExtentInSmallerChunks({
    extent: geom.getExtent(),
    chunkSquareSideLength,
    dataProj: DATA_PROJ,
    viewProj: VIEW_PROJ,
  }).filter((extent) => geom.intersectsExtent(extent));

  const featuresToRemove = geoJsonSource.getFeatures().filter((feat) => feat.getProperties().selectedGeometryUid === geomUid);

  const featuresFromApi: Feature<Geometry>[] = [];

  await Promise.all(
    interceptingExtentChunks.map(async (extent) => {
      const feats = await fetchPalstanSijaintitiedot(extent);
      featuresFromApi.push(...feats);
    })
  );

  const uniqueGeometries = uniqBy(featuresFromApi, (feat) => {
    const geometry = feat.getGeometry();
    const coordinates = geometry instanceof Polygon ? geometry.getCoordinates() : geometry?.getExtent();
    return JSON.stringify(coordinates);
  });

  const uniqueIntersecting = uniqueGeometries.filter((f) => {
    const g = f.getGeometry();
    if (!(g instanceof Polygon)) {
      return false;
    }
    if (geom instanceof MultiPolygon) {
      return intersect(multiPolygon(geom.getCoordinates()), polygon(g.getCoordinates()));
    } else {
      return intersect(polygon(geom.getCoordinates()), polygon(g.getCoordinates()));
    }
  });

  uniqueIntersecting.forEach((f) => {
    f.setProperties({ featureType: FEAT_TYPE, selectedGeometryUid: geomUid });
  });
  featuresToRemove.forEach((feat) => {
    geoJsonSource.removeFeature(feat);
  });
  geoJsonSource.addFeatures(uniqueIntersecting);
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

export function createTileLayer(): BaseLayer {
  return new TileLayer({
    source: new XYZ({
      projection,
      tileGrid,
      urls: ["/hassu/karttakuva/avoin/wmts/1.0.0/taustakartta/default/ETRS-TM35FIN/{z}/{y}/{x}.png"],
    }),
  });
}

const mvt = new MVT();

export function createVectorTileLayer(): BaseLayer {
  const layer = new VectorTileLayer({
    declutter: true,
    source: new VectorTileSource({
      projection,
      tileGrid,
      format: mvt,
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

const MAXIMUM_AREA = 9999999;
const validateSelection = (geom: Geometry | undefined): geom is Polygon => {
  if (!(geom instanceof Polygon || geom instanceof MultiPolygon)) {
    throw new UnsupportedGeometryTypeError("Lisätty ei tuettu geometria. Tuetut geometriatyypit: Polygon ja MultiPolygon");
  }
  if (getArea(geom, { projection }) > MAXIMUM_AREA) {
    throw new GeometryExceedsAreaLimitError("Rajaus on liian suuri. Tee pienempi rajaus.");
  }
  return true;
};

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
  handleSave: (event: Event) => void;
  handleExit: (event: Event) => void;
  handleSaveAndSearch: (event: Event) => void;
  view: View;
};

export function getControls({
  t,
  geoJsonSource,
  selectionSource: source,
  interactions,
  showErrorMessage,
  showSuccessMessage,
  handleSave,
  handleExit,
  handleSaveAndSearch,
  view,
}: DefaultControlProps) {
  const readGeoJsonOptions: ReadFeaturesFromGeoJsonFileInputControlOptions = {
    source,
    button: createElement(<Button title="Tuo karttatiedosto">Tuo karttatiedosto</Button>, "div").firstElementChild as HTMLButtonElement,
    onGeoJsonUpload: (features) => {
      const errors: Error[] = [];
      const featuresWithoutLines = features.filter((feat) => !(feat.getGeometry() instanceof LineString));
      const linePolygons = features
        .filter((feat) => feat.getGeometry() instanceof LineString)
        .map((feat) => {
          const geom = feat.getGeometry() as LineString;
          return format.readFeature(lineStringToPolygon(lineString(geom.getCoordinates())));
        });
      const suodatetut = featuresWithoutLines.concat(linePolygons).filter((feat) => {
        try {
          validateSelection(feat.getGeometry());
          return true;
        } catch (e) {
          if (e instanceof Error) {
            errors.push(e);
          }
        }
        return false;
      });
      source.clear();
      source.addFeatures(suodatetut);
      zoomToExtent(view, source.getExtent());
      const unsupportedGeometryError = errors.some((error) => error instanceof UnsupportedGeometryTypeError);
      const areaLimitError = errors.some((error) => error instanceof GeometryExceedsAreaLimitError);
      if (!errors.length) {
        showSuccessMessage("Karttarajaus luettu tiedostosta");
      } else {
        showErrorMessage(
          `${suodatetut.length ? "Osa karttarajauksen geometrioista" : "Karttarajauksen geometriat"} suodatettiin pois.` +
            (unsupportedGeometryError
              ? " Karttarajaus sisältää ei tuettuja geometriatyyppejä. Tällä hetkellä järjestelmä tukee vain Polygon-, MultiPolygon- ja LineString-tyyppisiä geometrioita."
              : "") +
            (areaLimitError ? " Karttarajaus on liian suuri. Tee karttarajauksesta pienempi." : "")
        );
      }
    },
    onInvalidFileType: () => {
      showErrorMessage("Tiedosto ei ole oikeaa tyyppiä. Varmista, että kyseessä on GeoJSON-tiedosto.");
    },
    onReaderFailure: () => {
      showErrorMessage("Tiedoston lukeminen epäonnistui");
    },
    onReadFeaturesFailure: (e) => {
      console.log(e);
      showErrorMessage("Tiedoston lukeminen epäonnistui");
    },
  };

  return new Collection([
    new ReadFeaturesFromGeoJsonFileInputControl(readGeoJsonOptions),
    new DrawControl({
      interactions,
      source,
      drawPolygon: {
        label: createElement(<MonikulmioIkoni />, "span"),
        tipLabel: "Piirrä monikulmio",
      },
      drawBox: {
        label: createElement(<SuorakulmioIkoni />, "span"),
        tipLabel: "Piirrä suorakulmio",
      },
      undo: {
        label: createElement(<KumoaIkoni />, "span"),
        tipLabel: "Kumoa",
      },
      removeFeature: {
        label: createIconSpan("trash"),
        tipLabel: "Poista valittu rajaus",
        tipLabelDisabled: "Valitse ensin karttarajaus jonka haluat poistaa",
      },
    }),
    new InfoControl({ geoJsonSource }),
    new SaveGeoJsonControl({
      buttons: [
        {
          handleClick: handleSave,
          button: createElement(
            <Button title="Tallenna luonnos" id="save_map_draft">
              Tallenna luonnos
            </Button>,
            "div"
          ).firstElementChild as HTMLButtonElement,
        },
        {
          handleClick: handleExit,
          button: createElement(
            <Button title="Poistu" id="exit_map">
              Poistu
            </Button>,
            "div"
          ).firstElementChild as HTMLButtonElement,
        },
        {
          handleClick: handleSaveAndSearch,
          button: createElement(
            <Button title="Tallenna ja hae" id="save_map_and_search" primary>
              Tallenna ja hae
            </Button>,
            "div"
          ).firstElementChild as HTMLButtonElement,
        },
      ],
    }),
    new ZoomToSourceExtent({
      source,
      label: createIconSpan("map-marker-alt"),
      tipLabel: t("kohdenna"),
    }),
    new Zoom({
      zoomInLabel: createIconSpan("plus"),
      zoomOutLabel: createIconSpan("minus"),
      zoomInTipLabel: t("lahenna"),
      zoomOutTipLabel: t("loitonna"),
    }),
  ]);
}
