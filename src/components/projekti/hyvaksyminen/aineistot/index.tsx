import React from "react";
import { useProjekti } from "src/hooks/useProjekti";
import Lukunakyma from "./Lukunakyma";
import Muokkausnakyma from "./Muokkausnakyma";

export default function Aineistot() {
  const { data: projekti } = useProjekti();

  const voiMuokata = !projekti?.hyvaksymisVaiheJulkaisut?.length;
  return voiMuokata ? <Muokkausnakyma /> : <Lukunakyma />;
}
