import React, { ReactElement } from "react";
import { HyvaksymisEsityksenAineistot } from "@services/api";
import { PreviewExpiredError } from "common/error/PreviewExpiredError";
import { useEsikatseleHyvaksymisEsitys } from "src/hooks/useEsikatseleHyvaksymisEsitys";
import HyvaksymisEsitysAineistoPage from "@components/HyvaksymisEsitys/AineistoPage";

export default function EsikatseleHyvaksymisEsitys(): ReactElement {
  const data: null | undefined | HyvaksymisEsityksenAineistot | PreviewExpiredError = useEsikatseleHyvaksymisEsitys().data;

  if (data instanceof PreviewExpiredError) {
    return <>Tarvittu data esikatselua varten on unohtunut. Sulje välilehti ja avaa esikatselu uudestaan.</>;
  }

  if (!data) {
    return <></>;
  }

  const { suunnitelma, poistumisPaiva, aineistopaketti } = data;

  return (
    <HyvaksymisEsitysAineistoPage aineistopaketti={aineistopaketti} suunnitelma={suunnitelma} poistumisPaiva={poistumisPaiva} esikatselu />
  );
}
