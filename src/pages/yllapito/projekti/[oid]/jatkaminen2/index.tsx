import React from "react";
import PaatosIndexPage from "@components/projekti/paatos/PaatosIndexPage";
import { PaatosTyyppi } from "src/util/getPaatosSpecificData";

function PaatosPage() {
  return <PaatosIndexPage paatosTyyppi={PaatosTyyppi.JATKOPAATOS2} />;
}

export default PaatosPage;