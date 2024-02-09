import Button from "@components/button/Button";
import HyvaksymisPaatosTiedostot from "./HyvaksymisPaatosTiedostotTaulu";
import { useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import AineistojenValitseminenDialog from "@components/projekti/common/AineistojenValitseminenDialog";
import { PaatosTyyppi } from "common/hyvaksymisPaatosUtil";
import { getPaatosInfoText } from "../textsForDifferentPaatos";
import { HyvaksymisPaatosVaiheAineistotFormValues } from "..";
import { adaptVelhoAineistoToAineistoInput, combineOldAndNewAineisto } from "@components/projekti/common/Aineistot/util";
import { HyvaksymisPaatosVaihe } from "@services/api";

type Props = {
  paatosTyyppi: PaatosTyyppi;
  vaihe: HyvaksymisPaatosVaihe | null | undefined;
};

export default function MuokkaustilainenPaatosTiedostot({ paatosTyyppi, vaihe }: Props) {
  const { watch, control } = useFormContext<HyvaksymisPaatosVaiheAineistotFormValues>();
  const hyvaksymisPaatos = watch("hyvaksymisPaatos");
  const poistetutHyvaksymisPaatos = watch("poistetutHyvaksymisPaatos");
  const { replace: replaceHyvaksymisPaatos } = useFieldArray({ control, name: "hyvaksymisPaatos" });
  const { replace: replacePoistetutHyvaksymisPaatos } = useFieldArray({ control, name: "poistetutHyvaksymisPaatos" });

  const [paatosDialogOpen, setPaatosDialogOpen] = useState(false);

  return (
    <>
      <p>{getPaatosInfoText(paatosTyyppi)}</p>
      {!!hyvaksymisPaatos?.length && <HyvaksymisPaatosTiedostot vaihe={vaihe} />}
      <Button type="button" onClick={() => setPaatosDialogOpen(true)} id="tuo_paatos_button">
        Tuo päätös
      </Button>
      <AineistojenValitseminenDialog
        open={paatosDialogOpen}
        infoText="Valitse yksi tai useampi päätöstiedosto."
        onClose={() => setPaatosDialogOpen(false)}
        onSubmit={(velhoAineistot) => {
          const newAineisto = velhoAineistot.map(adaptVelhoAineistoToAineistoInput);
          const { poistetut, lisatyt } = combineOldAndNewAineisto({
            oldAineisto: hyvaksymisPaatos,
            oldPoistetut: poistetutHyvaksymisPaatos,
            newAineisto,
          });
          replacePoistetutHyvaksymisPaatos(poistetut);
          replaceHyvaksymisPaatos(lisatyt);
        }}
      />
    </>
  );
}
