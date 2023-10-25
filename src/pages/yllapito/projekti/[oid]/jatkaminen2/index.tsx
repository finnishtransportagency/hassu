import React from "react";
import PaatosIndexPage from "@components/projekti/paatos/PaatosIndexPage";
import { PaatosTyyppi } from "common/hyvaksymisPaatosUtil";

function PaatosPage() {
  return <PaatosIndexPage paatosTyyppi={PaatosTyyppi.JATKOPAATOS2} />;
}

export default PaatosPage;
