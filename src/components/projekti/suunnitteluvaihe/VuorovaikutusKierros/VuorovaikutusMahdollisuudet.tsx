import { useFormContext } from "react-hook-form";
import { VuorovaikutusTilaisuusInput } from "@services/api";
import React, { ReactElement, Dispatch, SetStateAction } from "react";
import CommonVuorovaikutusMahdollisuudet from "../komponentit/VuorovaikutusMahdollisuudet";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";

interface Props {
  setOpenVuorovaikutustilaisuus: Dispatch<SetStateAction<boolean>>;
  projekti: ProjektiLisatiedolla;
}

type FormFields = {
  vuorovaikutusKierros: {
    vuorovaikutusTilaisuudet: Array<VuorovaikutusTilaisuusInput> | null;
  };
};

export default function VuorovaikutusMahdollisuudet({ projekti, setOpenVuorovaikutustilaisuus }: Props): ReactElement {
  const { getValues, getFieldState } = useFormContext<FormFields>();

  const vuorovaikutusTilaisuudet = getValues("vuorovaikutusKierros.vuorovaikutusTilaisuudet");

  const tilaisuudetError = getFieldState("vuorovaikutusKierros.vuorovaikutusTilaisuudet").error;

  return (
    <CommonVuorovaikutusMahdollisuudet
      showAjansiirtopainikkeet={false}
      vuorovaikutusTilaisuudet={vuorovaikutusTilaisuudet}
      projekti={projekti}
      setOpenVuorovaikutustilaisuus={setOpenVuorovaikutustilaisuus}
      tilaisuudetError={tilaisuudetError}
    />
  );
}
