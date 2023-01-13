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
  const hyvaksymisPaatos = watch("hyvaksymisPaatos");

  return (
    <>
      <h4 className="vayla-small-title mt-8 pt-8">Päätös *</h4>
      <p>
        Liitä Liikenne- ja viestintäviraston päätös. Päätöksen päivämäärä sekä asianumero löytyvät Kuulutuksen tiedot -välilehdeltä jos ne
        on lisätty{" "}
        <Link underline="none" href={`/yllapito/projekti/${projekti.oid}/kasittelyntila`}>
          Käsittelyn tila
        </Link>{" "}
        -sivulla.
      </p>
      <div className="m-6">
        {!hyvaksymisPaatos && <div>Ei hyvaksymispaatöstä</div>}
        <HyvaksymisPaatosTiedostot />
      </div>

      <Button type="button" onClick={() => setAineistoDialogOpen(true)} id="tuo_paatos_button">
        Tuo päätös
      </Button>
      <AineistojenValitseminenDialog
        open={aineistoDialogOpen}
        infoText="Valitse yksi tai useampi päätöstiedosto."
        onClose={() => setAineistoDialogOpen(false)}
        onSubmit={(velhoAineistot) => {
          const value = hyvaksymisPaatos || [];
          velhoAineistot
            .filter((aineisto) => !find(value, { dokumenttiOid: aineisto.oid }))
            .map((velhoAineisto) => ({
              dokumenttiOid: velhoAineisto.oid,
              nimi: velhoAineisto.tiedosto,
            }))
            .forEach((aineisto) => {
              value.push({ ...aineisto, jarjestys: value.length });
            });
          setValue("hyvaksymisPaatos", value, { shouldDirty: true });
        }}
      />
    </>
  );
}
