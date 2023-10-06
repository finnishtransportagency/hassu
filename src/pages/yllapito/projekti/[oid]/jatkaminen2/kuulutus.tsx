import React from "react";
import ProjektiConsumer from "@components/projekti/ProjektiConsumer";
import { PaatosTyyppi } from "src/util/getPaatosSpecificData";
import { PaatoksenKuulutuksenTiedotPage } from "@components/projekti/paatos/PaatosKuulutuksenTiedotPage";

export default function Jatkaminen2Wrapper() {
  return (
    <ProjektiConsumer useProjektiOptions={{ revalidateOnMount: true }}>
      {(projekti) => <PaatoksenKuulutuksenTiedotPage paatosTyyppi={PaatosTyyppi.JATKOPAATOS2} projekti={projekti} />}
    </ProjektiConsumer>
  );
}
