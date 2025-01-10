import React from "react";
import HassuStack from "@components/layout/HassuStack";
import TextInput from "@components/form/TextInput";
import TimePicker from "@components/form/TimePicker";
import { useFormContext } from "react-hook-form";
import { HassuDatePickerWithController } from "@components/form/HassuDatePicker";
import { today } from "hassu-common/util/dateUtils";
import { useProjekti } from "src/hooks/useProjekti";
import { getKaannettavatKielet } from "hassu-common/kaannettavatKielet";
import { VuorovaikutustilaisuusFormValues } from ".";
import { label } from "src/util/textUtil";
import { useAikavalidointi } from "src/hooks/useAikavalidointi";

export default function TilaisuudenNimiJaAika(props: { index: number; mostlyDisabled?: boolean; peruttu?: boolean | null }) {
  const {
    register,
    formState: { errors },
    trigger,
  } = useFormContext<VuorovaikutustilaisuusFormValues>();

  useAikavalidointi(props.index);

  const { data: projekti } = useProjekti();
  const kielitiedot = projekti?.kielitiedot;
  if (!kielitiedot) return <></>;
  const { ensisijainenKaannettavaKieli, toissijainenKaannettavaKieli } = getKaannettavatKielet(kielitiedot);

  return (
    <>
      {!!props.peruttu && <div className="text-red">PERUTTU</div>}
      {ensisijainenKaannettavaKieli && (
        <TextInput
          label={label({
            label: "Tilaisuuden nimi",
            inputLanguage: ensisijainenKaannettavaKieli,
            kielitiedot,
          })}
          {...register(`vuorovaikutusTilaisuudet.${props.index}.nimi.${ensisijainenKaannettavaKieli}`, {
            onChange: () => {
              if (toissijainenKaannettavaKieli) {
                trigger(`vuorovaikutusTilaisuudet.${props.index}.nimi.${toissijainenKaannettavaKieli}`);
              }
            },
          })}
          error={(errors as any)?.vuorovaikutusTilaisuudet?.[props.index]?.nimi?.[ensisijainenKaannettavaKieli]}
          disabled={!!props.peruttu}
          maxLength={200}
        />
      )}
      {toissijainenKaannettavaKieli && ensisijainenKaannettavaKieli && (
        <TextInput
          label={label({
            label: "Tilaisuuden nimi",
            inputLanguage: toissijainenKaannettavaKieli,
            kielitiedot,
          })}
          {...register(`vuorovaikutusTilaisuudet.${props.index}.nimi.${toissijainenKaannettavaKieli}`, {
            onChange: () => {
              trigger(`vuorovaikutusTilaisuudet.${props.index}.nimi.${ensisijainenKaannettavaKieli}`);
            },
          })}
          error={(errors as any)?.vuorovaikutusTilaisuudet?.[props.index]?.nimi?.[toissijainenKaannettavaKieli]}
          disabled={!!props.peruttu}
          maxLength={200}
        />
      )}{" "}
      <HassuStack direction={["column", "column", "row"]}>
        <HassuDatePickerWithController
          disabled={props.mostlyDisabled}
          label="Päivämäärä"
          minDate={today()}
          textFieldProps={{ required: true }}
          controllerProps={{ name: `vuorovaikutusTilaisuudet.${props.index}.paivamaara` }}
        />
        <TimePicker
          disabled={props.mostlyDisabled}
          label="Alkaa *"
          {...register(`vuorovaikutusTilaisuudet.${props.index}.alkamisAika`)}
          error={(errors as any)?.vuorovaikutusTilaisuudet?.[props.index]?.alkamisAika}
        ></TimePicker>
        <TimePicker
          disabled={props.mostlyDisabled}
          label="Päättyy *"
          {...register(`vuorovaikutusTilaisuudet.${props.index}.paattymisAika`)}
          error={(errors as any)?.vuorovaikutusTilaisuudet?.[props.index]?.paattymisAika}
        ></TimePicker>
      </HassuStack>
    </>
  );
}
