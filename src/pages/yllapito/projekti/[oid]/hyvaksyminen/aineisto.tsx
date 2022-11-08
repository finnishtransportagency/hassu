import React, { VFC } from "react";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import HyvaksyminenPageLayout, { PaatosTyyppi } from "@components/projekti/paatos/PaatosPageLayout";
import ProjektiConsumer from "@components/projekti/ProjektiConsumer";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";
import PaatosAineistotLukutila from "@components/projekti/lukutila/PaatosAineistotLukutila";
import PaatosAineistot from "@components/projekti/paatos/aineistot/index";

export default function HyvaksyminenAineistoWrapper() {
  return (
    <ProjektiConsumer useProjektiOptions={{ revalidateOnMount: true }}>
      {(projekti) => <HyvaksyminenAineisto projekti={projekti} />}
    </ProjektiConsumer>
  );
}

const HyvaksyminenAineisto: VFC<{ projekti: ProjektiLisatiedolla }> = ({ projekti }) => {
  const julkaisut = projekti?.hyvaksymisPaatosVaiheJulkaisut;
  const paatosJulkaisu = julkaisut ? julkaisut[julkaisut.length - 1] : null;

  const epaaktiivinen = projektiOnEpaaktiivinen(projekti);
  return (
    <HyvaksyminenPageLayout paatosTyyppi={PaatosTyyppi.HYVAKSYMISPAATOS}>
      {epaaktiivinen && paatosJulkaisu ? (
        <PaatosAineistotLukutila oid={projekti.oid} paatosJulkaisu={paatosJulkaisu} />
      ) : (
        <PaatosAineistot />
      )}
    </HyvaksyminenPageLayout>
  );
};
