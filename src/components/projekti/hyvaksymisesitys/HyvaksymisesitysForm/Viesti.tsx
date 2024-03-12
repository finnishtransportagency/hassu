import { Controller, useFormContext } from "react-hook-form";
import { HyvaksymisesitysFormValues } from "../types";
import SectionContent from "@components/layout/SectionContent";
import Textarea from "@components/form/Textarea";
import { Checkbox, FormControlLabel } from "@mui/material";

export default function Viesti({ index }: Readonly<{ index: number }>) {
  const {
    register,
    formState: { errors },
    control,
  } = useFormContext<HyvaksymisesitysFormValues>();

  return (
    <SectionContent className="mb-8">
      <h3 className="vayla-subtitle mb-1">Viesti vastaanottajalle</h3>
      <Controller
        name={`hyvaksymisesitykset.${index}.kiireellinenKasittely`}
        shouldUnregister
        control={control}
        render={({ field: { value, onChange, ...field } }) => (
          <FormControlLabel
            label="Pyydetään kiireellistä käsittelyä"
            control={
              <Checkbox
                checked={!!value}
                onChange={(event) => {
                  onChange(event.target.checked);
                }}
                {...field}
              />
            }
          />
        )}
      />
      <Textarea
        label="Viesti vastaanottajalle"
        {...register(`hyvaksymisesitykset.${index}.viesti`)}
        error={(errors as any).hyvaksymisesitykset?.[index]?.viesti}
        maxLength={2000}
      />
    </SectionContent>
  );
}
