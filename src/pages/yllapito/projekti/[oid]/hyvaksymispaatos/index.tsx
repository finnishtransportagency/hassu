import React from "react";
import ProjektiConsumer from "@components/projekti/ProjektiConsumer";
import { PaatoksenKuulutuksenTiedotPage } from "@components/projekti/paatos/PaatosKuulutuksenTiedotPage";
import { PaatosTyyppi } from "src/util/getPaatosSpecificData";

export default function HyvaksyminenWrapper() {
  return (
    <ProjektiConsumer useProjektiOptions={{ revalidateOnMount: true }}>
      {(projekti) => <PaatoksenKuulutuksenTiedotPage paatosTyyppi={PaatosTyyppi.HYVAKSYMISPAATOS} projekti={projekti} />}
    </ProjektiConsumer>
  );
}
