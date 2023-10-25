import React from "react";
import ProjektiConsumer from "@components/projekti/ProjektiConsumer";
import { PaatosTyyppi } from "hassu-common/hyvaksymisPaatosUtil";
import { PaatoksenKuulutuksenTiedotPage } from "@components/projekti/paatos/PaatosKuulutuksenTiedotPage";

export default function Jatkaminen1Wrapper() {
  return (
    <ProjektiConsumer useProjektiOptions={{ revalidateOnMount: true }}>
      {(projekti) => <PaatoksenKuulutuksenTiedotPage paatosTyyppi={PaatosTyyppi.JATKOPAATOS1} projekti={projekti} />}
    </ProjektiConsumer>
  );
}
