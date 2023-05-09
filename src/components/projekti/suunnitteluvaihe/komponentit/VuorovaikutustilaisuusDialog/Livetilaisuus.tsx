import SectionContent from "@components/layout/SectionContent";
import React, { ReactElement } from "react";
import Button from "@components/button/Button";
import TextInput from "@components/form/TextInput";
import Select from "@components/form/Select";
import HassuGrid from "@components/HassuGrid";
import { KaytettavaPalvelu, VuorovaikutusTilaisuusInput } from "@services/api";
import capitalize from "lodash/capitalize";
import { UseFieldArrayRemove, useFormContext, UseFormSetValue } from "react-hook-form";
import { lowerCase } from "lodash";
import { KaannettavaKieli } from "common/kaannettavatKielet";
import { TilaisuudenNimiJaAika } from "./TilaisuudenNimiJaAika";

export type VuorovaikutustilaisuusFormValues = {
  vuorovaikutusTilaisuudet: VuorovaikutusTilaisuusInput[];
};

interface Props {
  key: number;
  index: number;
  ensisijainenKaannettavaKieli: KaannettavaKieli | null;
  toissijainenKaannettavaKieli: KaannettavaKieli | null;
  setValue: UseFormSetValue<VuorovaikutustilaisuusFormValues>;
  remove: UseFieldArrayRemove;
  mostlyDisabled: boolean | undefined;
}

export default function Livetilaisuus({
  index,
  ensisijainenKaannettavaKieli,
  toissijainenKaannettavaKieli,
  remove,
  mostlyDisabled,
  key,
}: Props): ReactElement {
  const {
    register,
    formState: { errors },
    setValue,
    trigger,
    watch,
  } = useFormContext<VuorovaikutustilaisuusFormValues>();

  const peruttu = watch(`vuorovaikutusTilaisuudet.${index}.peruttu`);

  return (
    <SectionContent key={key} style={{ position: "relative" }}>
      <TilaisuudenNimiJaAika index={index} mostlyDisabled={mostlyDisabled} peruttu={peruttu} />
      <HassuGrid cols={{ lg: 3 }}>
        <Select
          addEmptyOption
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
      {ensisijainenKaannettavaKieli && (
        <TextInput
          label={`lisatiedot ensisijaisella kielellä (${lowerCase(ensisijainenKaannettavaKieli)})`}
          {...register(`vuorovaikutusTilaisuudet.${index}.lisatiedot.${ensisijainenKaannettavaKieli}`, {
            onChange: () => {
              if (toissijainenKaannettavaKieli) {
                trigger(`vuorovaikutusTilaisuudet.${index}.lisatiedot.${toissijainenKaannettavaKieli}`);
              }
            },
          })}
          error={(errors as any)?.vuorovaikutusTilaisuudet?.[index]?.lisatiedot?.[ensisijainenKaannettavaKieli]}
          maxLength={200}
          disabled={!!peruttu}
        />
      )}

      {toissijainenKaannettavaKieli && ensisijainenKaannettavaKieli && (
        <TextInput
          label={`lisatiedot ensisijaisella kielellä (${lowerCase(toissijainenKaannettavaKieli)})`}
          {...register(`vuorovaikutusTilaisuudet.${index}.lisatiedot.${toissijainenKaannettavaKieli}`, {
            onChange: () => {
              trigger(`vuorovaikutusTilaisuudet.${index}.lisatiedot.${ensisijainenKaannettavaKieli}`);
            },
          })}
          error={(errors as any)?.vuorovaikutusTilaisuudet?.[index]?.lisatiedot?.[toissijainenKaannettavaKieli]}
          maxLength={200}
          disabled={!!peruttu}
        />
      )}
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
    </SectionContent>
  );
}
