import { HyvaksymisPaatosVaihe, MuokkausTila } from "@services/api";
import React from "react";
import LukutilainenPaatos from "./LukutilainenPaatosTiedostot";
import MuokkaustilainenPaatosTiedostot from "./MuokkaustilainenPaatosTiedostot";
import { PaatosTyyppi } from "common/hyvaksymisPaatosUtil";
import { getPaatosSubtitle } from "../textsForDifferentPaatos";

export interface TiedostoLomakeProps {
  paatosTyyppi: PaatosTyyppi;
  vaihe: HyvaksymisPaatosVaihe | null | undefined;
}

export default function TiedostoLomake({ paatosTyyppi, vaihe }: TiedostoLomakeProps) {
  return (
    <>
      <h5 className="vayla-small-title">{getPaatosSubtitle(paatosTyyppi)}</h5>
      {vaihe?.muokkausTila === MuokkausTila.AINEISTO_MUOKKAUS ? (
        <LukutilainenPaatos vaihe={vaihe} />
      ) : (
        <MuokkaustilainenPaatosTiedostot vaihe={vaihe} paatosTyyppi={paatosTyyppi} />
      )}
    </>
  );
}
