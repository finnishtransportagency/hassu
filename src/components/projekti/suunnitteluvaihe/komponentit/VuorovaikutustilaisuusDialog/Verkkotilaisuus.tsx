import React, { ReactElement } from "react";
import Button from "@components/button/Button";
import TextInput from "@components/form/TextInput";
import Select from "@components/form/Select";
import HassuGrid from "@components/HassuGrid";
import { KaytettavaPalvelu, VuorovaikutusTilaisuusInput, VuorovaikutusTilaisuusTyyppi } from "@services/api";
import capitalize from "lodash/capitalize";
import { UseFieldArrayRemove, useFormContext, UseFormSetValue } from "react-hook-form";
import { KaannettavaKieli } from "hassu-common/kaannettavatKielet";
import TilaisuudenNimiJaAika from "./TilaisuudenNimiJaAika";
import { VuorovaikutusSectionContent } from ".";
import Lisatiedot from "./Lisatiedot";

export type VuorovaikutustilaisuusFormValues = {
  vuorovaikutusTilaisuudet: VuorovaikutusTilaisuusInput[];
};

interface Props {
  index: number;
  ensisijainenKaannettavaKieli: KaannettavaKieli | null;
  toissijainenKaannettavaKieli: KaannettavaKieli | null;
  setValue: UseFormSetValue<VuorovaikutustilaisuusFormValues>;
  remove: UseFieldArrayRemove;
  mostlyDisabled: boolean | undefined;
}

export default function Verkkotilaisuus({
  index,
  ensisijainenKaannettavaKieli,
  toissijainenKaannettavaKieli,
  remove,
  mostlyDisabled,
}: Props): ReactElement {
  const {
    register,
    formState: { errors },
    setValue,
    watch,
  } = useFormContext<VuorovaikutustilaisuusFormValues>();

  const peruttu = watch(`vuorovaikutusTilaisuudet.${index}.peruttu`);

  return (
    <VuorovaikutusSectionContent style={{ position: "relative" }}>
      <TilaisuudenNimiJaAika index={index} mostlyDisabled={mostlyDisabled} peruttu={peruttu} />
      <HassuGrid cols={{ lg: 3 }}>
        <Select
          emptyOption="Valitse"
          options={Object.keys(KaytettavaPalvelu).map((palvelu) => {
            return { label: capitalize(palvelu), value: palvelu };
          })}
          label="Käytettävä palvelu *"
          {...register(`vuorovaikutusTilaisuudet.${index}.kaytettavaPalvelu`)}
          error={(errors as any)?.vuorovaikutusTilaisuudet?.[index]?.kaytettavaPalvelu}
          disabled={!!peruttu}
        />
      </HassuGrid>
      <TextInput
        label="Linkki tilaisuuteen *"
        maxLength={2000}
        {...register(`vuorovaikutusTilaisuudet.${index}.linkki`)}
        error={(errors as any)?.vuorovaikutusTilaisuudet?.[index]?.linkki}
        disabled={!!peruttu}
      ></TextInput>
      <p>Linkki tilaisuuteen julkaistaan palvelun julkisella puolella kaksi (2) tuntia ennen tilaisuuden alkamista.</p>
      <Lisatiedot
        tilaisuustyyppi={VuorovaikutusTilaisuusTyyppi.VERKOSSA}
        ensisijainenKaannettavaKieli={ensisijainenKaannettavaKieli}
        toissijainenKaannettavaKieli={toissijainenKaannettavaKieli}
        index={index}
      />
      {mostlyDisabled ? (
        !peruttu && (
          <Button
            className="btn-remove-red"
            onClick={(event) => {
              event.preventDefault();
              setValue(`vuorovaikutusTilaisuudet.${index}.peruttu`, true);
            }}
          >
            Peru tilaisuus
          </Button>
        )
      ) : (
        <Button
          className="btn-remove-red"
          onClick={(event) => {
            event.preventDefault();
            remove(index);
          }}
        >
          Poista
        </Button>
      )}
    </VuorovaikutusSectionContent>
  );
}
