import React from "react";
import { useProjekti } from "src/hooks/useProjekti";
import Lukunakyma from "./Lukunakyma";
import Muokkausnakyma from "./Muokkausnakyma";

interface Props {
  setIsDirty: (value: React.SetStateAction<boolean>) => void;
}

export default function Aineistot({ setIsDirty }: Props) {
  const { data: projekti } = useProjekti();

  const voiMuokata = !projekti?.hyvaksymisPaatosVaiheJulkaisut?.length;
  return voiMuokata ? <Muokkausnakyma setIsDirty={setIsDirty} /> : <Lukunakyma />;
}
