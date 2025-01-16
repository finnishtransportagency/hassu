import React, { ReactElement } from "react";
import { LadattavatTiedostot } from "@services/api";
import { useEsikatseleLausuntoPyynnonTaydennysAineistot } from "src/hooks/useEsikatseleLausuntoPyynnonTaydennysAineistot";
import { PreviewExpiredError } from "common/error/PreviewExpiredError";
import LausuntopyyntoTaydennysAineistoPage from "@components/projekti/lausuntopyynnot/LausuntopyyntoTaydennysAineistoPage";

export default function EsikatseleLausuntopyynnonTaydennysAineistot(): ReactElement {
  const data: null | undefined | LadattavatTiedostot | PreviewExpiredError = useEsikatseleLausuntoPyynnonTaydennysAineistot().data;

  if (data instanceof PreviewExpiredError) {
    return <>Tarvittu data esikatselua varten on unohtunut. Sulje välilehti ja avaa esikatselu uudestaan.</>;
  }

  if (!data) {
    return <></>;
  }

  const { muutAineistot, muistutukset, kunta, poistumisPaiva, aineistopaketti, julkinen, nimi, projektiOid } = data;

  return (
    <LausuntopyyntoTaydennysAineistoPage
      muutAineistot={muutAineistot}
      muistutukset={muistutukset}
      kunta={kunta}
      nimi={nimi}
      poistumisPaiva={poistumisPaiva}
      aineistopaketti={aineistopaketti}
      julkinen={julkinen}
      projektiOid={projektiOid}
      esikatselu
    />
  );
}
