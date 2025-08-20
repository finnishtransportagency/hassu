import Section from "@components/layout/Section2";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import PoistumisPaiva from "../PoistumisPaiva";
import Linkki from "../Linkki";
import LisaAineistot from "./LisaAineistot";
import Muistiinpano from "./Muistiinpano";
import { Stack } from "@mui/system";
import Button from "@components/button/Button";
import { FieldErrors, UseFieldArrayRemove, useFieldArray, useFormContext } from "react-hook-form";
import { LausuntoPyynnotFormValues } from "../types";
import VarmistusDialogi from "./VarmistusDialogi";
import { useCallback, useState } from "react";

export default function LausuntoPyyntoForm({
  index,
  projekti,
  errors,
  remove,
}: Readonly<{ index: number; projekti: ProjektiLisatiedolla; remove: UseFieldArrayRemove; errors: FieldErrors }>) {
  const { getValues, control } = useFormContext<LausuntoPyynnotFormValues>();
  const { append: appendToPoistetut } = useFieldArray({ name: `poistetutLausuntoPyynnot`, control });
  const [dialogOpen, setDialogOpen] = useState(false);

  const poista = useCallback(() => {
    if (getValues(`lausuntoPyynnot.${index}.tallennettu`)) {
      appendToPoistetut({ ...getValues(`lausuntoPyynnot.${index}`), poistetaan: true });
      remove(index);
    } else {
      remove(index);
    }
  }, [appendToPoistetut, getValues, index, remove]);

  const formDataForThisLink = getValues(`lausuntoPyynnot.${index}`);

  return (
    <Section style={{ marginBottom: "2.5rem", marginTop: "2.5rem" }}>
      <Stack direction="row" justifyContent="space-between">
        <h2 className="vayla-title" style={{ marginBottom: 12 }}>
          Lausuntopyyntöön liitettävä aineisto
        </h2>
        {!!index && (
          <Button
            className="pl-12 pr-12 pt-1 pb-1"
            style={{ color: "orangered", borderColor: "orangered" }}
            onClick={() => setDialogOpen(true)}
          >
            Poista
          </Button>
        )}
      </Stack>
      <PoistumisPaiva index={index} />
      <Muistiinpano index={index} />
      <Linkki index={index} projekti={projekti} uuid={formDataForThisLink.uuid} formData={formDataForThisLink} />
      <LisaAineistot index={index} projekti={projekti} errors={errors}/>
      <VarmistusDialogi
        dialogiOnAuki={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onAccept={() => {
          poista();
          setDialogOpen(false);
        }}
      />
    </Section>
  );
}
