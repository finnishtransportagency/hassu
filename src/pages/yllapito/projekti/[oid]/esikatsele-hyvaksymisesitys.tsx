import React, { ReactElement } from "react";
import { HyvaksymisEsityksenAineistot } from "@services/api";
import { PreviewExpiredError } from "common/error/PreviewExpiredError";
import { useEsikatseleHyvaksymisEsitys } from "src/hooks/useEsikatseleHyvaksymisEsitys";
import HyvaksymisEsitysAineistoPage, { EsikatseluMode } from "@components/HyvaksymisEsitys/AineistoPage";
import dynamic from "next/dynamic";

export default dynamic(() => Promise.resolve(EsikatseleHyvaksymisEsitys), {
  ssr: false,
});

function EsikatseleHyvaksymisEsitys(): ReactElement {
  const data: null | undefined | HyvaksymisEsityksenAineistot | PreviewExpiredError = useEsikatseleHyvaksymisEsitys().data;

  if (data instanceof PreviewExpiredError) {
    return <>Tarvittu data esikatselua varten on unohtunut. Sulje välilehti ja avaa esikatselu uudestaan.</>;
  }

  if (!data) {
    return <></>;
  }

  return <HyvaksymisEsitysAineistoPage {...data} esikatselu={EsikatseluMode.ESIKATSELU} />;
}
