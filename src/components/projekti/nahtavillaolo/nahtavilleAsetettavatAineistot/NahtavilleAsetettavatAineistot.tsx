import React from "react";
import { useProjekti } from "src/hooks/useProjekti";
import Lukunakyma from "./Lukunakyma";
import Muokkausnakyma from "./Muokkausnakyma";

interface Props {
  setIsDirty: (value: React.SetStateAction<boolean>) => void;
}

export default function NahtavilleAsetettavatAineistot({ setIsDirty }: Props) {
  const { data: projekti } = useProjekti();

  const voiMuokata = !projekti?.nahtavillaoloVaiheJulkaisut?.length;
  return voiMuokata ? <Muokkausnakyma setIsDirty={setIsDirty} /> : <Lukunakyma />;
}
