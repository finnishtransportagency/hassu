import React, { ReactElement } from "react";
import { LadattavatTiedostot } from "@services/api";
import { useEsikatseleLausuntoPyynnonAineistot } from "src/hooks/useEsikatseleLausuntoPyynnonAineistot";
import { useProjekti } from "src/hooks/useProjekti";
import { PreviewExpiredError } from "common/error/PreviewExpiredError";
import LausuntopyyntoAineistoPage from "@components/projekti/lausuntopyynnot/LausuntopyyntoAineistoPage";

export default function EsikatseleLausuntopyynnonAineistot(): ReactElement {
  const data: null | undefined | LadattavatTiedostot | PreviewExpiredError = useEsikatseleLausuntoPyynnonAineistot().data;
  const { data: projekti } = useProjekti();

  if (data instanceof PreviewExpiredError) {
    return <>Tarvittu data esikatselua varten on unohtunut. Sulje välilehti ja avaa esikatselu uudestaan.</>;
  }

  if (!data) {
    return <></>;
  }

  const { lisaAineistot, poistumisPaiva, aineistot, aineistopaketti, julkinen } = data;

  return (
    <LausuntopyyntoAineistoPage
      projekti={projekti}
      aineistopaketti={aineistopaketti}
      aineistot={aineistot}
      lisaAineistot={lisaAineistot}
      poistumisPaiva={poistumisPaiva}
      julkinen={julkinen}
      esikatselu
    />
  );
}
