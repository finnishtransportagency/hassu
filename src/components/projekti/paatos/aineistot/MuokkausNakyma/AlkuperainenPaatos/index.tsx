import { HyvaksymisPaatosVaihe } from "@services/api";
import React from "react";
import MuokkaustilainenAlkuperainenPaatosTiedostot from "./MuokkaustilainenAlkuperainenPaatosTiedostot";

export interface TiedostoLomakeProps {
  vaihe: HyvaksymisPaatosVaihe | null | undefined;
}

export default function AlkuperainenPaatos() {
  return (
    <>
      <h4 className="vayla-small-title mt-10">Alkuperäinen hyväksymispäätös ja muu liittyvä aineisto</h4>
      <MuokkaustilainenAlkuperainenPaatosTiedostot />
    </>
  );
}
