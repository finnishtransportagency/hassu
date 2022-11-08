import React, { VFC } from "react";
import KuulutuksenTiedot from "@components/projekti/paatos/kuulutuksenTiedot/index";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import PaatosPageLayout, { PaatosTyyppi } from "@components/projekti/paatos/PaatosPageLayout";
import ProjektiConsumer from "@components/projekti/ProjektiConsumer";
import { projektiOnEpaaktiivinen } from "src/util/statusUtil";
import Lukunakyma from "@components/projekti/paatos/kuulutuksenTiedot/Lukunakyma";

export default function HyvaksyminenWrapper() {
  return (
    <ProjektiConsumer useProjektiOptions={{ revalidateOnMount: true }}>
      {(projekti) => <Hyvaksyminen projekti={projekti} />}
    </ProjektiConsumer>
  );
}

const Hyvaksyminen: VFC<{ projekti: ProjektiLisatiedolla }> = ({ projekti }) => {
  const julkaisut = projekti.hyvaksymisPaatosVaiheJulkaisut;
  const paatosJulkaisu = julkaisut ? julkaisut[julkaisut.length - 1] : null;
  const paatoksenTiedot = projekti.hyvaksymisPaatosVaihe;

  const epaaktiivinen = projektiOnEpaaktiivinen(projekti);
  return (
    <PaatosPageLayout paatosTyyppi={PaatosTyyppi.HYVAKSYMISPAATOS}>
      {epaaktiivinen && paatosJulkaisu ? (
        <Lukunakyma projekti={projekti} hyvaksymisPaatosVaiheJulkaisu={paatosJulkaisu} paatosTyyppi={PaatosTyyppi.HYVAKSYMISPAATOS} />
      ) : (
        <KuulutuksenTiedot paatosJulkaisut={julkaisut} paatoksenTiedot={paatoksenTiedot} paatosTyyppi={PaatosTyyppi.HYVAKSYMISPAATOS} />
      )}
    </PaatosPageLayout>
  );
};
