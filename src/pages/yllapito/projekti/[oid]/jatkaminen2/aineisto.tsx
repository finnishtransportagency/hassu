import React from "react";
import ProjektiConsumer from "@components/projekti/ProjektiConsumer";
import { PaatoksenAineistotPage } from "@components/projekti/paatos/PaatosAineistotPage";
import { PaatosTyyppi } from "src/util/getPaatosSpecificData";

export default function Jatkaminen2AineistoWrapper() {
  return (
    <ProjektiConsumer useProjektiOptions={{ revalidateOnMount: true }}>
      {(projekti) => <PaatoksenAineistotPage paatosTyyppi={PaatosTyyppi.JATKOPAATOS2} projekti={projekti} />}
    </ProjektiConsumer>
  );
}
