import React, { ReactElement } from "react";
import { HyvaksymisEsityksenAineistot } from "@services/api";
import { useHyvaksymisEsityksenAineistot } from "src/hooks/useHyvaksymisEsityksenAineistot";
import HyvaksymisEsitysAineistoPage from "@components/HyvaksymisEsitys/AineistoPage";
import VanhentunutAineistolinkki, { AineistoType } from "@components/projekti/common/Aineistot/VanhentunutAineistolinkki";
import EiHyvaksymisEsitysta from "@components/HyvaksymisEsitys/EiHyvaksymisEsitysta";

export default function HyvaksymisesitysLinkki(): ReactElement {
  const data: null | undefined | HyvaksymisEsityksenAineistot = useHyvaksymisEsityksenAineistot().data;
  if (!data) {
    return <></>;
  }

  if (data.linkkiVanhentunut) {
    return (
      <VanhentunutAineistolinkki
        poistumisPaiva={data.poistumisPaiva}
        suunnitelmanNimi={data.perustiedot.suunnitelmanNimi}
        projarinYhteystiedot={data.projektipaallikonYhteystiedot}
        tyyppi={AineistoType.HYVAKSYMISESITYS}
      />
    );
  }

  if (data.eiOlemassa) {
    return (
      <EiHyvaksymisEsitysta
        suunnitelmanNimi={data.perustiedot.suunnitelmanNimi}
        projarinYhteystiedot={data.projektipaallikonYhteystiedot}
      />
    );
  }

  return <HyvaksymisEsitysAineistoPage {...data} />;
}
