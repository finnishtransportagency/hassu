import React, { ReactElement } from "react";
import { useLisaAineisto } from "src/hooks/useLisaAineisto";
import { LadattavatTiedostot } from "@services/api";
import LausuntopyyntoAineistoPage from "@components/projekti/lausuntopyynnot/LausuntopyyntoAineistoPage";
import VanhentunutAineistolinkki from "@components/projekti/common/Aineistot/VanhentunutAineistolinkki";

export default function Lausuntopyyntoaineistot(): ReactElement {
  const data: null | undefined | LadattavatTiedostot = useLisaAineisto().data;
  const poistumisPaiva = data?.poistumisPaiva;
  if (!(poistumisPaiva && data)) {
    return <></>;
  }
  const { lisaAineistot, aineistopaketti, aineistot, julkinen, nimi, tyyppi, projektiOid } = data;

  if (data.linkkiVanhentunut) {
    return (
      <VanhentunutAineistolinkki
        suunnitelmanNimi={data.nimi}
        projarinYhteystiedot={data.projektipaallikonYhteystiedot}
        poistumisPaiva={data.poistumisPaiva}
      />
    );
  }

  return (
    <LausuntopyyntoAineistoPage
      aineistopaketti={aineistopaketti}
      aineistot={aineistot}
      lisaAineistot={lisaAineistot}
      poistumisPaiva={poistumisPaiva}
      julkinen={julkinen}
      nimi={nimi}
      tyyppi={tyyppi}
      projektiOid={projektiOid}
    />
  );
}
