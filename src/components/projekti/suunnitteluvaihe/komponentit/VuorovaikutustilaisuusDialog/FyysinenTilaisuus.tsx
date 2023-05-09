import React, { ReactElement } from "react";
import Button from "@components/button/Button";
import TextInput from "@components/form/TextInput";
import HassuGrid from "@components/HassuGrid";
import { UseFieldArrayRemove, useFormContext, UseFormSetValue } from "react-hook-form";

import { lowerCase } from "lodash";
import { KaannettavaKieli } from "common/kaannettavatKielet";
import { VuorovaikutusSectionContent, VuorovaikutustilaisuusFormValues } from ".";
import { TilaisuudenNimiJaAika } from "./TilaisuudenNimiJaAika";

interface Props {
  index: number;
  ensisijainenKaannettavaKieli: KaannettavaKieli | null;
  toissijainenKaannettavaKieli: KaannettavaKieli | null;
  setValue: UseFormSetValue<VuorovaikutustilaisuusFormValues>;
  remove: UseFieldArrayRemove;
  mostlyDisabled: boolean | undefined;
}
export default function FyysinenTilaisuus({
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
            label={`Paikan nimi ensisijaisella kielellä (${lowerCase(ensisijainenKaannettavaKieli)})`}
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
            label={`Paikan nimi toissijaisella kielellä (${lowerCase(toissijainenKaannettavaKieli)})`}
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
            label={`Osoite ensisijaisella kielellä (${lowerCase(ensisijainenKaannettavaKieli)}) *`}
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
            label={`Osoite toissijaisella kielellä (${lowerCase(toissijainenKaannettavaKieli)}) *`}
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
            type="button"
            onClick={() => {
              setValue(`vuorovaikutusTilaisuudet.${index}.peruttu`, true);
            }}
          >
            Peru tilaisuus
          </Button>
        )
      ) : (
        <Button
          className="btn-remove-red"
          type="button"
          onClick={() => {
            remove(index);
          }}
        >
          Poista
        </Button>
      )}
    </VuorovaikutusSectionContent>
  );
}
