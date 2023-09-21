import React from "react";
import ProjektiConsumer from "@components/projekti/ProjektiConsumer";
import { PaatoksenKuulutuksenTiedotPage } from "@components/projekti/paatos/PaatosKuulutuksenTiedotPage";
import { PaatosTyyppi } from "common/hyvaksymisPaatosUtil";

export default function Jatkaminen2Wrapper() {
  return (
    <ProjektiConsumer useProjektiOptions={{ revalidateOnMount: true }}>
      {(projekti) => <PaatoksenKuulutuksenTiedotPage paatosTyyppi={PaatosTyyppi.JATKOPAATOS2} projekti={projekti} />}
    </ProjektiConsumer>
  );
}
