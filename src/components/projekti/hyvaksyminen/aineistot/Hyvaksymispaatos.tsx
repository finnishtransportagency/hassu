import React, { useState } from "react";
import Button from "@components/button/Button";
import AineistojenValitseminenDialog from "@components/projekti/common/AineistojenValitseminenDialog";
import { AineistoInput, Projekti } from "@services/api";
import { useFormContext } from "react-hook-form";
import { find } from "lodash";
import { Link } from "@mui/material";
import HyvaksymisPaatosTiedostot from "./HyvaksymisPaatosTiedostot";

type FormFields = {
  hyvaksymisPaatos: AineistoInput[];
};

type Props = {
  projekti: Projekti;
};

export default function Hyvaksymispaatos({ projekti }: Props) {
  const [aineistoDialogOpen, setAineistoDialogOpen] = useState(false);
  const { setValue, watch } = useFormContext<FormFields>();
  const aineistot = watch("hyvaksymisPaatos");

  return (
    <>
      <h4 className="vayla-small-title mt-8 pt-8">Päätös *</h4>
      <p>
        Liitä Liikenne- ja viestintäviraston päätös. Päätöksen päivämäärä sekä asianumero löytyvät Kuulutuksen tiedot
        -välilehdeltä jos ne on lisätty{" "}
        <Link underline="none" href={`/yllapito/projekti/${projekti.oid}/kasittelyntila`}>
          Käsittelyn tila
        </Link>{" "}
        -sivulla.
      </p>
      <div className="m-6">
        {!aineistot && <div>Ei hyvaksymispaatöstä</div>}
        <HyvaksymisPaatosTiedostot />
      </div>

      <Button type="button" onClick={() => setAineistoDialogOpen(true)}>
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
