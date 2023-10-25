import React from "react";
import ProjektiConsumer from "@components/projekti/ProjektiConsumer";
import { PaatoksenAineistotPage } from "@components/projekti/paatos/PaatosAineistotPage";
import { PaatosTyyppi } from "hassu-common/hyvaksymisPaatosUtil";

export default function Jatkaminen1AineistoWrapper() {
  return (
    <ProjektiConsumer useProjektiOptions={{ revalidateOnMount: true }}>
      {(projekti) => <PaatoksenAineistotPage paatosTyyppi={PaatosTyyppi.JATKOPAATOS1} projekti={projekti} />}
    </ProjektiConsumer>
  );
}
