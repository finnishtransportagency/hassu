import Button from "@components/button/Button";
import HyvaksymisPaatosTiedostot from "./HyvaksymisPaatosTiedostotTaulu";
import { useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import AineistojenValitseminenDialog from "@components/projekti/common/AineistojenValitseminenDialog";
import { PaatosTyyppi } from "common/hyvaksymisPaatosUtil";
import { getPaatosInfoText } from "../textsForDifferentPaatos";
import { HyvaksymisPaatosVaiheAineistotFormValues } from "..";
import { adaptVelhoAineistoToAineistoInput, combineOldAndNewAineisto } from "@components/projekti/common/Aineistot/util";

type Props = {
  paatosTyyppi: PaatosTyyppi;
};

export default function MuokkaustilainenPaatosTiedostot({ paatosTyyppi }: Props) {
  const { watch, control } = useFormContext<HyvaksymisPaatosVaiheAineistotFormValues>();
  const hyvaksymisPaatos = watch("hyvaksymisPaatos");
  const { replace: replaceHyvaksymisPaatos } = useFieldArray({ control, name: "hyvaksymisPaatos" });

  const [paatosDialogOpen, setPaatosDialogOpen] = useState(false);

  return (
    <div>
      <p>{getPaatosInfoText(paatosTyyppi)}</p>
      <Button type="button" onClick={() => setPaatosDialogOpen(true)} id="tuo_paatos_button">
        Tuo päätös
      </Button>
      {!!hyvaksymisPaatos?.length && <HyvaksymisPaatosTiedostot />}
      <AineistojenValitseminenDialog
        open={paatosDialogOpen}
        infoText="Valitse yksi tai useampi päätöstiedosto."
        onClose={() => setPaatosDialogOpen(false)}
        onSubmit={(velhoAineistot) => {
          const newAineisto = velhoAineistot.map(adaptVelhoAineistoToAineistoInput);
          const newHyvaksymisPaatos = combineOldAndNewAineisto({
            oldAineisto: hyvaksymisPaatos,
            newAineisto,
          });
          replaceHyvaksymisPaatos(newHyvaksymisPaatos);
        }}
      />
    </div>
  );
}
