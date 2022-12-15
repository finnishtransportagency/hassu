import { MuokkausTila } from "@services/api";
import React from "react";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import { PaatosSpecificData, PaatosTyyppi } from "src/util/getPaatosSpecificData";
import Lukunakyma from "./Lukunakyma";
import Muokkausnakyma from "./Muokkausnakyma";

export default function Aineistot({
  paatosTyyppi,
  julkaisematonPaatos,
  projekti,
}: { paatosTyyppi: PaatosTyyppi; projekti: ProjektiLisatiedolla } & Pick<PaatosSpecificData, "julkaisematonPaatos">) {
  const voiMuokata = !julkaisematonPaatos?.muokkausTila || julkaisematonPaatos?.muokkausTila === MuokkausTila.MUOKKAUS;

  return voiMuokata ? (
    <Muokkausnakyma julkaisematonPaatos={julkaisematonPaatos} paatosTyyppi={paatosTyyppi} />
  ) : (
    <Lukunakyma paatosTyyppi={paatosTyyppi} projekti={projekti} />
  );
}
