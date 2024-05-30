import React, { ReactElement } from "react";
import { HyvaksymisEsityksenAineistot } from "@services/api";
import VanhentunutAineistolinkki from "@components/projekti/lausuntopyynnot/VanhentunutAineistolinkki";
import { useHyvaksymisEsityksenAineistot } from "src/hooks/useHyvaksymisEsityksenAineistot";
import HyvaksymisEsitysAineistoPage from "@components/HyvaksymisEsitys/AineistoPage";

export default function HyvaksymisesitysLinkki(): ReactElement {
  const data: null | undefined | HyvaksymisEsityksenAineistot = useHyvaksymisEsityksenAineistot().data;
  const poistumisPaiva = data?.poistumisPaiva;
  if (!(poistumisPaiva && data)) {
    return <></>;
  }

  if (data.linkkiVanhentunut) {
    return <VanhentunutAineistolinkki suunnitelmanNimi={data.suunnitelmanNimi} data={data} hyvaksymisesitys />;
  }

  return <HyvaksymisEsitysAineistoPage {...data} />;
}
