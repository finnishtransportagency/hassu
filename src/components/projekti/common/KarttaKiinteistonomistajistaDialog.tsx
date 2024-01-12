import React, { useCallback, useMemo } from "react";
import { Vector as VectorSource } from "ol/source.js";
import GeoJSON from "ol/format/GeoJSON.js";
import { Options } from "ol/control/FullScreen";
import { createTileLayer, createVectorLayer, defaultControls, StyledMap } from "./StyledMap";
import { Dialog, DialogProps, styled } from "@mui/material";
import Button from "@components/button/Button";
import { MapOptions } from "ol/Map";
import { defaults as defaultInteractions, Interaction, Snap } from "ol/interaction";
import * as geozi from "./some.json";
import useTranslation from "next-translate/useTranslation";
// import DrawControl from "../../../map/DrawControl";
import DeleteFeatureControl from "src/map/DeleteFeatureControl";

export type CustomOptions = Options & { activeTipLabel?: string; inactiveTipLabel?: string };

type KarttaProps = {
  geoJSON: string | null | undefined;
} & DialogProps;

export function KarttaKiinteistonomistajistaDialog({ geoJSON: _geoJSON, ...dialogProps }: Readonly<KarttaProps>) {
  const { t } = useTranslation("kartta");
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

  const close = useCallback(() => {
    dialogProps.onClose?.({}, "backdropClick");
  }, [dialogProps]);

  const mapOptions: Partial<MapOptions> = useMemo(() => {
    const extendInteractions: Interaction[] = [new Snap({ source: vectorSource })];

    if (vectorSource) {
      // extendInteractions.push(new Modify({ source: vectorSource }));
    }

    const vectorLayer = createVectorLayer(vectorSource);
    let options: Partial<MapOptions> = {
      interactions: defaultInteractions().extend(extendInteractions),
      controls: defaultControls(t, vectorSource.getExtent()).extend([
        // new DrawControl({ source: vectorSource }),
        new DeleteFeatureControl({ source: vectorSource, layer: vectorLayer }),
      ]),
      layers: [createTileLayer(), vectorLayer],
    };
    return options;
  }, [t, vectorSource]);

  return (
    <StyledDialog fullScreen {...dialogProps}>
      <StyledMap
        sx={{
          "& .ol-control.ol-draw": {
            boxShadow: "none",
            display: "contents",
            gap: "10px",
            backgroundColor: "transparent",
            borderRadius: "0px",
            pointerEvents: "none",
            "& > button": {
              boxShadow: "0 4px 4px 1px rgb(0 0 0 / 0.2)",
              borderRadius: "4px",
              backgroundColor: "white",
              position: "absolute",
              top: "50px",
              "&.ol-draw-undo": {
                right: "168px",
              },
              "&.ol-draw-string-line": {
                right: "120px",
              },
              "&.ol-draw-polygon": {
                right: "72px",
              },
              "&.ol-draw-box": {
                right: "24px",
              },
            },
          },
          "& .ol-control.ol-delete-geometry": {
            top: "50px",
            margin: 0,
            right: "216px",
          },
        }}
        vectorSource={vectorSource}
        mapOptions={mapOptions}
        id="maanomistajat_map"
      />
      <Button onClick={close}>Poistu</Button>
      <Button onClick={close}>Tallenna ja hae</Button>
    </StyledDialog>
  );
}

const StyledDialog = styled(Dialog)(() => ({}));
