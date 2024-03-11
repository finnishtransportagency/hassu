import Section from "@components/layout/Section2";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import PoistumisPaiva from "../PoistumisPaiva";
import Linkki from "../Linkki";
import LisaAineistot from "./Kuulutukset";
import Viesti from "./Viesti";
import Muistutukset from "./Muistutukset";
import MuuAineisto from "./MuuAineisto";
import { Stack } from "@mui/system";
import Button from "@components/button/Button";
import { UseFieldArrayRemove, useFieldArray, useFormContext } from "react-hook-form";
import { HyvaksymisesitysFormValues } from "../types";
import VarmistusDialogi from "./VarmistusDialogi";
import { useCallback, useState } from "react";

export default function HyvaksymisesitysForm({
  index,
  projekti,
  remove,
}: Readonly<{ index: number; projekti: ProjektiLisatiedolla; remove: UseFieldArrayRemove }>) {
  const { getValues, control } = useFormContext<HyvaksymisesitysFormValues>();
  const { append: appendToPoistetut } = useFieldArray({ name: `poistetutHyvaksymisesitykset`, control });
  const [dialogOpen, setDialogOpen] = useState(false);

  const poista = useCallback(() => {
    if (getValues(`hyvaksymisesitykset.${index}.tallennettu`)) {
      appendToPoistetut({ ...getValues(`hyvaksymisesitykset.${index}`), poistetaan: true });
      remove(index);
    } else {
      remove(index);
    }
  }, [appendToPoistetut, getValues, index, remove]);

  const formDataForThisLink = getValues(`hyvaksymisesitykset.${index}`);

  return (
    <Section style={{ marginBottom: "6em" }}>
      <Stack direction="row" justifyContent="space-between">
        <h2 className="vayla-title">Hyväksymisesitykseen liitettävä aineisto</h2>
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
      <Muistutukset index={index} projekti={projekti} />
      <MuuAineisto index={index} projekti={projekti} />
      <PoistumisPaiva index={index} />
      <Viesti index={index} />
      <Linkki index={index} projekti={projekti} uuid={formDataForThisLink.uuid} formData={formDataForThisLink} />
      <LisaAineistot index={index} projekti={projekti} />
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
