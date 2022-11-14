import React from "react";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import { PaatosSpecificData, PaatosTyyppi } from "src/util/getPaatosSpecificData";
import Lukunakyma from "./Lukunakyma";
import Muokkausnakyma from "./Muokkausnakyma";

export default function Aineistot({
  paatosTyyppi,
  julkaisematonPaatos,
  julkaisut,
  projekti,
}: { paatosTyyppi: PaatosTyyppi; projekti: ProjektiLisatiedolla } & Pick<PaatosSpecificData, "julkaisematonPaatos" | "julkaisut">) {
  const voiMuokata = !julkaisut?.length;
  return voiMuokata ? (
    <Muokkausnakyma julkaisematonPaatos={julkaisematonPaatos} paatosTyyppi={paatosTyyppi} />
  ) : (
    <Lukunakyma paatosTyyppi={paatosTyyppi} projekti={projekti} />
  );
}
