import { VuorovaikutusKierrosJulkaisu } from "@services/api";
import React, { ReactElement, Dispatch, SetStateAction } from "react";
import CommonVuorovaikutusMahdollisuudet from "../komponentit/VuorovaikutusMahdollisuudet";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";

interface Props {
  vuorovaikutusKierrosJulkaisu: VuorovaikutusKierrosJulkaisu;
  setOpenVuorovaikutustilaisuus?: Dispatch<SetStateAction<boolean>>;
  projekti: ProjektiLisatiedolla;
  showAjansiirtopainikkeet: boolean;
}

export default function VuorovaikutusMahdollisuudet({
  projekti,
  vuorovaikutusKierrosJulkaisu,
  setOpenVuorovaikutustilaisuus,
  showAjansiirtopainikkeet,
}: Props): ReactElement {
  const vuorovaikutusTilaisuudet = vuorovaikutusKierrosJulkaisu.vuorovaikutusTilaisuudet || null;

  return (
    <CommonVuorovaikutusMahdollisuudet
      showAjansiirtopainikkeet={showAjansiirtopainikkeet}
      vuorovaikutusTilaisuudet={vuorovaikutusTilaisuudet}
      projekti={projekti}
      setOpenVuorovaikutustilaisuus={setOpenVuorovaikutustilaisuus}
    />
  );
}
