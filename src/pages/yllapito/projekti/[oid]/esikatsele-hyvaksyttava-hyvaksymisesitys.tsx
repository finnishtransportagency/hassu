import HyvaksymisEsitysAineistoPage, { EsikatseluMode } from "@components/HyvaksymisEsitys/AineistoPage";
import React from "react";
import { useEsikatseleHyvaksyttavaHyvaksymisEsitys } from "src/hooks/useEsikatseleHyvaksyttavaHyvaksymisEsitys";

export default function EsikatseleHyvaksyttavaHyvaksymisesitys() {
  const { data } = useEsikatseleHyvaksyttavaHyvaksymisEsitys();

  if (!data) {
    return <></>;
  }

  return <HyvaksymisEsitysAineistoPage {...data} esikatselu={EsikatseluMode.ESIKATSELU_AINEISTOLINKEILLA} />;
}
