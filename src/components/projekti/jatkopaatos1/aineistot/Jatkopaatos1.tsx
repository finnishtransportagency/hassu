import React, { useState } from "react";
import Button from "@components/button/Button";
import AineistojenValitseminenDialog from "@components/projekti/common/AineistojenValitseminenDialog";
import { AineistoInput } from "@services/api";
import { useFormContext } from "react-hook-form";
import { find } from "lodash";
import Jatkopaatos1Tiedostot from "./Jatkopaatos1Tiedostot";

type FormFields = {
  hyvaksymisPaatos: AineistoInput[];
};

export default function Jatkopaatos1() {
  const [aineistoDialogOpen, setAineistoDialogOpen] = useState(false);
  const { setValue, watch } = useFormContext<FormFields>();
  const aineistot = watch("hyvaksymisPaatos");

  return (
    <>
      <h4 className="vayla-small-title mt-8 pt-8">Päätös ja jatkopäätös *</h4>
      <p>
        Liitä Liikenne- ja viestintäviraston päätökset suunnitelman hyväksymisestä sekä päätös suunnitelman voimassaoloajan pidentämisestä.
        Jatkopäätöksen päivämäärä sekä asiatunnus löytyvät automaattisesti Kuulutuksen tiedot -välilehdeltä.
      </p>
      <div className="m-6">
        {!aineistot && <div>Ei hyvaksymispäätöstä</div>}
        <Jatkopaatos1Tiedostot />
      </div>

      <Button type="button" onClick={() => setAineistoDialogOpen(true)} id="tuo_paatos_button">
        Tuo päätös
      </Button>
      <AineistojenValitseminenDialog
        open={aineistoDialogOpen}
        onClose={() => setAineistoDialogOpen(false)}
        onSubmit={(newAineistot) => {
          const value = aineistot || [];
          newAineistot.forEach((aineisto) => {
            if (!find(value, { dokumenttiOid: aineisto.dokumenttiOid })) {
              value.push({ ...aineisto, kategoriaId: null, jarjestys: value.length });
            }
          });
          setValue("hyvaksymisPaatos", value, { shouldDirty: true });
        }}
      />
    </>
  );
}
