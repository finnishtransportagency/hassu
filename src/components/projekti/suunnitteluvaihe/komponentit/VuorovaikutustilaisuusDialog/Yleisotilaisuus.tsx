import React, { ReactElement } from "react";
import Button from "@components/button/Button";
import TextInput from "@components/form/TextInput";
import HassuGrid from "@components/HassuGrid";
import { UseFieldArrayRemove, useFormContext, UseFormSetValue } from "react-hook-form";
import { KaannettavaKieli } from "hassu-common/kaannettavatKielet";
import { VuorovaikutusSectionContent, VuorovaikutustilaisuusFormValues } from ".";
import TilaisuudenNimiJaAika from "./TilaisuudenNimiJaAika";
import Lisatiedot from "./Lisatiedot";
import { VuorovaikutusTilaisuusTyyppi } from "@services/api";
import { label } from "src/util/textUtil";

interface Props {
  index: number;
  ensisijainenKaannettavaKieli: KaannettavaKieli | null;
  toissijainenKaannettavaKieli: KaannettavaKieli | null;
  setValue: UseFormSetValue<VuorovaikutustilaisuusFormValues>;
  remove: UseFieldArrayRemove;
  mostlyDisabled: boolean | undefined;
}
export default function YleisoTilaisuus({
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
    trigger,
    watch,
  } = useFormContext<VuorovaikutustilaisuusFormValues>();

  const peruttu = watch(`vuorovaikutusTilaisuudet.${index}.peruttu`);

  return (
    <VuorovaikutusSectionContent style={{ position: "relative" }}>
      <TilaisuudenNimiJaAika index={index} mostlyDisabled={mostlyDisabled} peruttu={peruttu} />
      <HassuGrid cols={{ lg: 3 }}>
        {ensisijainenKaannettavaKieli && (
          <TextInput
            label={label({
              label: "Paikka (esim. kunnantalo)",
              inputLanguage: ensisijainenKaannettavaKieli,
              toissijainenKieli: toissijainenKaannettavaKieli,
            })}
            maxLength={200}
            style={{ gridColumn: "1 / span 1" }}
            {...register(`vuorovaikutusTilaisuudet.${index}.paikka.${ensisijainenKaannettavaKieli}`, {
              onChange: () => {
                if (toissijainenKaannettavaKieli) {
                  trigger(`vuorovaikutusTilaisuudet.${index}.paikka.${toissijainenKaannettavaKieli}`);
                }
              },
            })}
            error={(errors as any)?.vuorovaikutusTilaisuudet?.[index]?.paikka?.[ensisijainenKaannettavaKieli]}
            disabled={mostlyDisabled}
          />
        )}

        {toissijainenKaannettavaKieli && ensisijainenKaannettavaKieli && (
          <TextInput
            label={label({
              label: "Paikka (esim. kunnantalo)",
              inputLanguage: toissijainenKaannettavaKieli,
              toissijainenKieli: toissijainenKaannettavaKieli,
            })}
            maxLength={200}
            style={{ gridColumn: "2 / span 1" }}
            {...register(`vuorovaikutusTilaisuudet.${index}.paikka.${toissijainenKaannettavaKieli}`, {
              onChange: () => {
                trigger(`vuorovaikutusTilaisuudet.${index}.paikka.${ensisijainenKaannettavaKieli}`);
              },
            })}
            error={(errors as any)?.vuorovaikutusTilaisuudet?.[index]?.paikka?.[toissijainenKaannettavaKieli]}
            disabled={mostlyDisabled}
          />
        )}
      </HassuGrid>
      {ensisijainenKaannettavaKieli && (
        <HassuGrid cols={{ lg: 5 }}>
          <TextInput
            label={label({
              label: "Osoite",
              inputLanguage: ensisijainenKaannettavaKieli,
              toissijainenKieli: toissijainenKaannettavaKieli,
              required: true,
            })}
            maxLength={200}
            disabled={mostlyDisabled}
            style={{ gridColumn: "1 / span 2" }}
            {...register(`vuorovaikutusTilaisuudet.${index}.osoite.${ensisijainenKaannettavaKieli}`, {
              onChange: () => {
                if (toissijainenKaannettavaKieli) {
                  trigger(`vuorovaikutusTilaisuudet.${index}.osoite.${ensisijainenKaannettavaKieli}`);
                }
              },
            })}
            error={(errors as any)?.vuorovaikutusTilaisuudet?.[index]?.osoite?.[ensisijainenKaannettavaKieli]}
          />
          <TextInput
            label="Postinumero *"
            disabled={mostlyDisabled}
            maxLength={200}
            {...register(`vuorovaikutusTilaisuudet.${index}.postinumero`)}
            error={(errors as any)?.vuorovaikutusTilaisuudet?.[index]?.postinumero}
          />
          <TextInput
            label="Postitoimipaikka"
            disabled={mostlyDisabled}
            maxLength={200}
            {...register(`vuorovaikutusTilaisuudet.${index}.postitoimipaikka.${ensisijainenKaannettavaKieli}`, {
              onChange: () => {
                if (toissijainenKaannettavaKieli) {
                  trigger(`vuorovaikutusTilaisuudet.${index}.postitoimipaikka.${toissijainenKaannettavaKieli}`);
                }
              },
            })}
            error={(errors as any)?.vuorovaikutusTilaisuudet?.[index]?.postitoimipaikka?.[ensisijainenKaannettavaKieli]}
          />
        </HassuGrid>
      )}
      {toissijainenKaannettavaKieli && ensisijainenKaannettavaKieli && (
        <HassuGrid cols={{ lg: 5 }}>
          <TextInput
            label={label({
              label: "Osoite",
              inputLanguage: toissijainenKaannettavaKieli,
              toissijainenKieli: toissijainenKaannettavaKieli,
              required: true,
            })}
            maxLength={200}
            disabled={mostlyDisabled}
            style={{ gridColumn: "1 / span 2" }}
            {...register(`vuorovaikutusTilaisuudet.${index}.osoite.${toissijainenKaannettavaKieli}`, {
              onChange: () => {
                trigger(`vuorovaikutusTilaisuudet.${index}.osoite.${ensisijainenKaannettavaKieli}`);
              },
            })}
            error={(errors as any)?.vuorovaikutusTilaisuudet?.[index]?.osoite?.[toissijainenKaannettavaKieli]}
          />
          <TextInput
            label="Postinumero *"
            disabled={true}
            maxLength={200}
            value={watch(`vuorovaikutusTilaisuudet.${index}.postinumero`) || ""}
          />
          <TextInput
            label="Postitoimipaikka"
            disabled={mostlyDisabled}
            maxLength={200}
            {...register(`vuorovaikutusTilaisuudet.${index}.postitoimipaikka.${toissijainenKaannettavaKieli}`, {
              onChange: () => {
                trigger(`vuorovaikutusTilaisuudet.${index}.postitoimipaikka.${ensisijainenKaannettavaKieli}`);
              },
            })}
            error={(errors as any)?.vuorovaikutusTilaisuudet?.[index]?.postitoimipaikka?.[toissijainenKaannettavaKieli]}
          />
        </HassuGrid>
      )}

      <Lisatiedot
        tilaisuustyyppi={VuorovaikutusTilaisuusTyyppi.PAIKALLA}
        ensisijainenKaannettavaKieli={ensisijainenKaannettavaKieli}
        toissijainenKaannettavaKieli={toissijainenKaannettavaKieli}
        index={index}
      />
      {mostlyDisabled ? (
        !peruttu && (
          <div className="mt-8">
            <Button
              className="btn-remove-red"
              type="button"
              onClick={() => {
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
            type="button"
            onClick={() => {
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
