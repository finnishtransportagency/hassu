import React, { ReactElement } from "react";
import { useLausuntoPyynnonTaydennysAineistot } from "src/hooks/useLausuntoPyynnonTaydennysAineistot";
import { LadattavatTiedostot } from "@services/api";
import { useProjektiJulkinen } from "src/hooks/useProjektiJulkinen";
import VanhentunutAineistolinkki from "@components/projekti/lausuntopyynnot/VanhentunutAineistolinkki";
import LausuntopyyntoTaydennysAineistoPage from "@components/projekti/lausuntopyynnot/LausuntopyyntoTaydennysAineistoPage";

export default function Lausuntopyyntoaineistot(): ReactElement {
  const data: null | undefined | LadattavatTiedostot = useLausuntoPyynnonTaydennysAineistot().data;
  const { data: projekti } = useProjektiJulkinen();
  const poistumisPaiva = data?.poistumisPaiva;
  if (!(poistumisPaiva && data && projekti)) {
    return <></>;
  }
  if (data.linkkiVanhentunut) {
    return <VanhentunutAineistolinkki projekti={projekti} data={data} />;
  }

  const { muutAineistot, muistutukset, aineistopaketti, kunta } = data;
  return (
    <LausuntopyyntoTaydennysAineistoPage
      poistumisPaiva={poistumisPaiva}
      muutAineistot={muutAineistot}
      aineistopaketti={aineistopaketti}
      muistutukset={muistutukset}
      projekti={projekti}
      kunta={kunta}
    />
  );
}
