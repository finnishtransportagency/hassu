import React, { VFC } from "react";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import HyvaksyminenPageLayout from "@components/projekti/paatos/HyvaksyminenPageLayout";
import ProjektiConsumer from "@components/projekti/ProjektiConsumer";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";
import HyvaksymisVaiheAineistotLukutila from "@components/projekti/lukutila/HyvakysmisVaiheAineistotLukutila";
import PaatosAineistot from "@components/projekti/paatos/aineistot/index";

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
        <HyvaksymisVaiheAineistotLukutila oid={projekti.oid} hyvaksymisPaatosVaiheJulkaisu={hyvaksymisPaatosVaiheJulkaisu} />
      ) : (
        <PaatosAineistot />
      )}
    </HyvaksyminenPageLayout>
  );
};
