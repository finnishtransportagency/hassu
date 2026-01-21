import { HyvaksymisPaatosVaihe, MuokkausTila } from "@services/api";
import React from "react";
import { PaatosTyyppi } from "common/hyvaksymisPaatosUtil";
import MuokkaustilainenAlkuperainenPaatosTiedostot from "./MuokkaustilainenAlkuperainenPaatosTiedostot";
import LukutilainenAlkuperainenPaatosTiedostot from "./LukutilainenAlkuperainenPaatosTiedostot";

export interface TiedostoLomakeProps {
  paatosTyyppi: PaatosTyyppi;
  vaihe: HyvaksymisPaatosVaihe | null | undefined;
}

export default function AlkuperainenPaatos({ vaihe }: TiedostoLomakeProps) {
  return (
    <>
      <h4 className="vayla-small-title mt-10">Alkuperäinen hyväksymispäätös ja muu liittyvä aineisto</h4>
      {vaihe?.muokkausTila === MuokkausTila.AINEISTO_MUOKKAUS ? (
        <LukutilainenAlkuperainenPaatosTiedostot vaihe={vaihe} />
      ) : (
        <MuokkaustilainenAlkuperainenPaatosTiedostot />
      )}
    </>
  );
}
