import React from "react";
import PaatosIndexPage from "@components/projekti/paatos/PaatosIndexPage";
import { PaatosTyyppi } from "hassu-common/hyvaksymisPaatosUtil";

function PaatosPage() {
  return <PaatosIndexPage paatosTyyppi={PaatosTyyppi.JATKOPAATOS1} />;
}

export default PaatosPage;
