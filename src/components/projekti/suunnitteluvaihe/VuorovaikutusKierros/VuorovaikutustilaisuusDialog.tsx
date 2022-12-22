import React, { ReactElement, useCallback } from "react";
import { VuorovaikutusTilaisuusInput, Yhteystieto } from "@services/api";
import { VuorovaikutusFormValues } from "@components/projekti/suunnitteluvaihe/VuorovaikutusKierros";
import { useFormContext } from "react-hook-form";
import VuorovaikutustilaisuusDialog from "../komponentit/VuorovaikutustilaisuusDialog";

export type VuorovaikutustilaisuusFormValues = {
  vuorovaikutusTilaisuudet: VuorovaikutusTilaisuusInput[];
};

interface Props {
  open: boolean;
  windowHandler: (isOpen: boolean) => void;
  tilaisuudet: VuorovaikutusTilaisuusInput[] | null | undefined;
  projektiHenkilot: (Yhteystieto & { kayttajatunnus: string })[];
}

export default function VuorovaikutusDialog({ open, windowHandler, tilaisuudet, projektiHenkilot }: Props): ReactElement {
  const { setValue: parentSetValue } = useFormContext<VuorovaikutusFormValues>();

  const onSubmit = useCallback(
    (formData: VuorovaikutustilaisuusFormValues) => {
      parentSetValue("vuorovaikutusKierros.vuorovaikutusTilaisuudet", formData.vuorovaikutusTilaisuudet, {
        shouldDirty: true,
        shouldValidate: true,
      });
    },
    [parentSetValue]
  );

  return (
    <VuorovaikutustilaisuusDialog
      open={open}
      windowHandler={windowHandler}
      tilaisuudet={tilaisuudet || []}
      projektiHenkilot={projektiHenkilot}
      onSubmit={onSubmit}
    />
  );
}
