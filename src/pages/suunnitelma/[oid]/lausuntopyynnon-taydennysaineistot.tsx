import React, { ReactElement } from "react";
import { useLausuntoPyynnonTaydennysAineistot } from "src/hooks/useLausuntoPyynnonTaydennysAineistot";
import { LadattavatTiedostot } from "@services/api";
import LausuntopyyntoTaydennysAineistoPage from "@components/projekti/lausuntopyynnot/LausuntopyyntoTaydennysAineistoPage";
import VanhentunutAineistolinkki from "@components/projekti/common/Aineistot/VanhentunutAineistolinkki";

export default function Lausuntopyyntoaineistot(): ReactElement {
  const data: null | undefined | LadattavatTiedostot = useLausuntoPyynnonTaydennysAineistot().data;
  const poistumisPaiva = data?.poistumisPaiva;
  if (!(poistumisPaiva && data)) {
    return <></>;
  }
  if (data.linkkiVanhentunut) {
    return (
      <VanhentunutAineistolinkki
        suunnitelmanNimi={data.nimi}
        projarinYhteystiedot={data.projektipaallikonYhteystiedot}
        poistumisPaiva={data.poistumisPaiva}
      />
    );
  }

  const { muutAineistot, muistutukset, aineistopaketti, kunta, nimi } = data;
  return (
    <LausuntopyyntoTaydennysAineistoPage
      poistumisPaiva={poistumisPaiva}
      muutAineistot={muutAineistot}
      aineistopaketti={aineistopaketti}
      muistutukset={muistutukset}
      kunta={kunta}
      nimi={nimi}
    />
  );
}
