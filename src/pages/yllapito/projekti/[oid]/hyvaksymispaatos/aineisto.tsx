import React from "react";
import ProjektiConsumer from "@components/projekti/ProjektiConsumer";
import { PaatoksenAineistotPage } from "@components/projekti/paatos/PaatosAineistotPage";
import { PaatosTyyppi } from "src/util/getPaatosSpecificData";

export default function HyvaksyminenAineistoWrapper() {
  return (
    <ProjektiConsumer useProjektiOptions={{ revalidateOnMount: true }}>
      {(projekti) => <PaatoksenAineistotPage paatosTyyppi={PaatosTyyppi.HYVAKSYMISPAATOS} projekti={projekti} />}
    </ProjektiConsumer>
  );
}
