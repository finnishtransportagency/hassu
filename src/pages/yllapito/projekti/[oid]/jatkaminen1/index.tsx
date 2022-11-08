import React, { VFC } from "react";
import KuulutuksenTiedot from "@components/projekti/paatos/kuulutuksenTiedot/index";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import HyvaksyminenPageLayout, { PaatosTyyppi } from "@components/projekti/paatos/PaatosPageLayout";
import ProjektiConsumer from "@components/projekti/ProjektiConsumer";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";
import Lukunakyma from "@components/projekti/paatos/kuulutuksenTiedot/Lukunakyma";

export default function Jatkaminen1Wrapper() {
  return (
    <ProjektiConsumer useProjektiOptions={{ revalidateOnMount: true }}>
      {(projekti) => <Jatkaminen1 projekti={projekti} />}
    </ProjektiConsumer>
  );
}

const Jatkaminen1: VFC<{ projekti: ProjektiLisatiedolla }> = ({ projekti }) => {
  const julkaisut = projekti?.jatkoPaatos1VaiheJulkaisut;
  const paatosJulkaisu = julkaisut ? julkaisut[julkaisut.length - 1] : null;

  const epaaktiivinen = projektiOnEpaaktiivinen(projekti);
  return (
    <HyvaksyminenPageLayout paatosTyyppi={PaatosTyyppi.JATKOPAATOS1}>
      {epaaktiivinen && paatosJulkaisu ? (
        <Lukunakyma projekti={projekti} hyvaksymisPaatosVaiheJulkaisu={paatosJulkaisu} paatosTyyppi={PaatosTyyppi.JATKOPAATOS1} />
      ) : (
        <KuulutuksenTiedot paatosTyyppi={PaatosTyyppi.JATKOPAATOS1} />
      )}
    </HyvaksyminenPageLayout>
  );
};
