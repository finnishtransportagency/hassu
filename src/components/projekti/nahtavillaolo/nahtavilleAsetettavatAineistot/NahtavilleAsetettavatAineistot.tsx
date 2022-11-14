import React from "react";
import { useProjekti } from "src/hooks/useProjekti";
import Lukunakyma from "./Lukunakyma";
import Muokkausnakyma from "./Muokkausnakyma";

export default function NahtavilleAsetettavatAineistot() {
  const { data: projekti } = useProjekti();

  const voiMuokata = !projekti?.nahtavillaoloVaiheJulkaisut?.length;
  return voiMuokata ? <Muokkausnakyma /> : <Lukunakyma />;
}
