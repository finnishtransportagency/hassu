import React, { VFC } from "react";
import KuulutuksenTiedot from "@components/projekti/paatos/kuulutuksenTiedot/index";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import HyvaksyminenPageLayout from "@components/projekti/paatos/HyvaksyminenPageLayout";
import ProjektiConsumer from "@components/projekti/ProjektiConsumer";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";
import Lukunakyma from "@components/projekti/paatos/kuulutuksenTiedot/Lukunakyma";

export default function HyvaksymisPaatosWrapper() {
  return <ProjektiConsumer>{(projekti) => <Hyvaksymispaatos projekti={projekti} />}</ProjektiConsumer>;
}

const Hyvaksymispaatos: VFC<{ projekti: ProjektiLisatiedolla }> = ({ projekti }) => {
  const hyvaksymisPaatosVaiheJulkaisu = projekti?.hyvaksymisPaatosVaiheJulkaisut
    ? projekti.hyvaksymisPaatosVaiheJulkaisut[projekti.hyvaksymisPaatosVaiheJulkaisut.length - 1]
    : null;

  const epaaktiivinen = projektiOnEpaaktiivinen(projekti);
  return (
    <HyvaksyminenPageLayout>
      {epaaktiivinen && hyvaksymisPaatosVaiheJulkaisu ? (
        <Lukunakyma projekti={projekti} hyvaksymisPaatosVaiheJulkaisu={hyvaksymisPaatosVaiheJulkaisu} />
      ) : (
        <KuulutuksenTiedot />
      )}
    </HyvaksyminenPageLayout>
  );
};
