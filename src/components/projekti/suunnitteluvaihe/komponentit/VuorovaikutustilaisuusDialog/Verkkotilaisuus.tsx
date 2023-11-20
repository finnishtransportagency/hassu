import React, { ReactElement } from "react";
import Button from "@components/button/Button";
import TextInput from "@components/form/TextInput";
import HassuGrid from "@components/HassuGrid";
import { KaytettavaPalvelu, Kielitiedot, VuorovaikutusTilaisuusInput, VuorovaikutusTilaisuusTyyppi } from "@services/api";
import capitalize from "lodash/capitalize";
import { UseFieldArrayRemove, useFormContext, UseFormSetValue } from "react-hook-form";
import TilaisuudenNimiJaAika from "./TilaisuudenNimiJaAika";
import { VuorovaikutusSectionContent } from ".";
import Lisatiedot from "./Lisatiedot";
import HassuMuiSelect from "@components/form/HassuMuiSelect";
import { MenuItem } from "@mui/material";

export type VuorovaikutustilaisuusFormValues = {
  vuorovaikutusTilaisuudet: VuorovaikutusTilaisuusInput[];
};

interface Props {
  index: number;
  kielitiedot: Kielitiedot;
  setValue: UseFormSetValue<VuorovaikutustilaisuusFormValues>;
  remove: UseFieldArrayRemove;
  mostlyDisabled: boolean | undefined;
}

export default function Verkkotilaisuus({ index, kielitiedot, remove, mostlyDisabled }: Props): ReactElement {
  const {
    register,
    formState: { errors },
    setValue,
    watch,
    control,
  } = useFormContext<VuorovaikutustilaisuusFormValues>();

  const peruttu = watch(`vuorovaikutusTilaisuudet.${index}.peruttu`);

  return (
    <VuorovaikutusSectionContent style={{ position: "relative" }}>
      <TilaisuudenNimiJaAika index={index} mostlyDisabled={mostlyDisabled} peruttu={peruttu} />
      <HassuGrid cols={{ lg: 3 }}>
        <HassuMuiSelect
          control={control}
          defaultValue=""
          label="Käytettävä palvelu *"
          name={`vuorovaikutusTilaisuudet.${index}.kaytettavaPalvelu`}
          error={(errors as any)?.vuorovaikutusTilaisuudet?.[index]?.kaytettavaPalvelu}
          disabled={!!peruttu}
        >
          {Object.keys(KaytettavaPalvelu).map((palvelu) => {
            return (
              <MenuItem key={palvelu} value={palvelu}>
                {capitalize(palvelu)}
              </MenuItem>
            );
          })}
        </HassuMuiSelect>
      </HassuGrid>
      <TextInput
        label="Linkki tilaisuuteen *"
        maxLength={2000}
        {...register(`vuorovaikutusTilaisuudet.${index}.linkki`)}
        error={(errors as any)?.vuorovaikutusTilaisuudet?.[index]?.linkki}
        disabled={!!peruttu}
      ></TextInput>
      <p>Linkki tilaisuuteen julkaistaan palvelun julkisella puolella kaksi (2) tuntia ennen tilaisuuden alkamista.</p>
      <Lisatiedot tilaisuustyyppi={VuorovaikutusTilaisuusTyyppi.VERKOSSA} kielitiedot={kielitiedot} index={index} />
      {mostlyDisabled ? (
        !peruttu && (
          <div className="mt-8">
            <Button
              className="btn-remove-red"
              onClick={(event) => {
                event.preventDefault();
                setValue(`vuorovaikutusTilaisuudet.${index}.peruttu`, true);
              }}
            >
              Peru tilaisuus
            </Button>
          </div>
        )
      ) : (
        <div className="mt-8">
          <Button
            className="btn-remove-red"
            onClick={(event) => {
              event.preventDefault();
              remove(index);
            }}
          >
            Poista
          </Button>
        </div>
      )}
    </VuorovaikutusSectionContent>
  );
}
