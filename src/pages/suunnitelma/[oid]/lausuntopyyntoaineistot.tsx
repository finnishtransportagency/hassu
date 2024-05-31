import React, { ReactElement } from "react";
import { useLisaAineisto } from "src/hooks/useLisaAineisto";
import { LadattavatTiedostot } from "@services/api";
import { useProjektiJulkinen } from "src/hooks/useProjektiJulkinen";
import LausuntopyyntoAineistoPage from "@components/projekti/lausuntopyynnot/LausuntopyyntoAineistoPage";
import VanhentunutAineistolinkki from "@components/projekti/common/Aineistot/VanhentunutAineistolinkki";

export default function Lausuntopyyntoaineistot(): ReactElement {
  const data: null | undefined | LadattavatTiedostot = useLisaAineisto().data;
  const { data: projekti } = useProjektiJulkinen();
  const poistumisPaiva = data?.poistumisPaiva;
  if (!(poistumisPaiva && data && projekti)) {
    return <></>;
  }
  const { lisaAineistot, aineistopaketti, aineistot } = data;

  if (data.linkkiVanhentunut) {
    return (
      <VanhentunutAineistolinkki
        suunnitelmanNimi={projekti.velho?.nimi}
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
      projekti={projekti}
    />
  );
}
