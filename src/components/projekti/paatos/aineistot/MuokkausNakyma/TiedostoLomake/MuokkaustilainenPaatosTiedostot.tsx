import Button from "@components/button/Button";
import { AineistoInput, VelhoAineisto } from "@services/api";
import HyvaksymisPaatosTiedostot from "./HyvaksymisPaatosTiedostotTaulu";
import { useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import AineistojenValitseminenDialog from "@components/projekti/common/AineistojenValitseminenDialog";
import find from "lodash/find";
import { PaatosTyyppi } from "common/hyvaksymisPaatosUtil";
import { getPaatosInfoText } from "../textsForDifferentPaatos";
import { HyvaksymisPaatosVaiheAineistotFormValues } from "..";

type Props = {
  paatosTyyppi: PaatosTyyppi;
};

export default function MuokkaustilainenPaatosTiedostot({ paatosTyyppi }: Props) {
  const { watch, control } = useFormContext<HyvaksymisPaatosVaiheAineistotFormValues>();
  const hyvaksymisPaatos = watch("hyvaksymisPaatos");
  const poistetutHyvaksymisPaatos = watch("poistetutHyvaksymisPaatos");
  const { replace: replaceHyvaksymisPaatos } = useFieldArray({ control, name: "hyvaksymisPaatos" });
  const { replace: replacePoistetutHyvaksymisPaatos } = useFieldArray({ control, name: "poistetutHyvaksymisPaatos" });

  const [paatosDialogOpen, setPaatosDialogOpen] = useState(false);

  return (
    <>
      <p>{getPaatosInfoText(paatosTyyppi)}</p>
      {!!hyvaksymisPaatos?.length && <HyvaksymisPaatosTiedostot />}
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

function combineOldAndNewAineisto({
  oldAineisto,
  oldPoistetut,
  newAineisto,
}: {
  oldAineisto?: AineistoInput[];
  oldPoistetut?: AineistoInput[];
  newAineisto: AineistoInput[];
}) {
  return newAineisto.reduce<{ lisatyt: AineistoInput[]; poistetut: AineistoInput[] }>(
    (acc, velhoAineisto) => {
      if (!find(acc.lisatyt, { dokumenttiOid: velhoAineisto.dokumenttiOid })) {
        acc.lisatyt.push({ ...velhoAineisto, jarjestys: acc.lisatyt.length });
      }
      acc.poistetut = acc.poistetut.filter((poistettu) => poistettu.dokumenttiOid !== velhoAineisto.dokumenttiOid);
      return acc;
    },
    { lisatyt: oldAineisto || [], poistetut: oldPoistetut || [] }
  );
}

function adaptVelhoAineistoToAineistoInput(velhoAineisto: VelhoAineisto): AineistoInput {
  return {
    dokumenttiOid: velhoAineisto.oid,
    nimi: velhoAineisto.tiedosto,
  };
}
