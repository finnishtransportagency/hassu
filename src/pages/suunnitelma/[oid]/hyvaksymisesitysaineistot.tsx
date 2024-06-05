import React, { ReactElement } from "react";
import { HyvaksymisEsityksenAineistot } from "@services/api";
import { useHyvaksymisEsityksenAineistot } from "src/hooks/useHyvaksymisEsityksenAineistot";
import HyvaksymisEsitysAineistoPage from "@components/HyvaksymisEsitys/AineistoPage";
import VanhentunutAineistolinkki from "@components/projekti/common/Aineistot/VanhentunutAineistolinkki";

export default function HyvaksymisesitysLinkki(): ReactElement {
  const data: null | undefined | HyvaksymisEsityksenAineistot = useHyvaksymisEsityksenAineistot().data;
  const poistumisPaiva = data?.poistumisPaiva;
  if (!(poistumisPaiva && data)) {
    return <></>;
  }

  if (data.linkkiVanhentunut) {
    return (
      <VanhentunutAineistolinkki
        poistumisPaiva={data.poistumisPaiva}
        suunnitelmanNimi={data.perustiedot.suunnitelmanNimi}
        projarinYhteystiedot={data.projektipaallikonYhteystiedot}
        hyvaksymisesitys
      />
    );
  }

  return <HyvaksymisEsitysAineistoPage {...data} />;
}
