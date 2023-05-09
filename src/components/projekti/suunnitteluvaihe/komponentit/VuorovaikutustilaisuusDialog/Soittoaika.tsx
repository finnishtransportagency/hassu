import SectionContent from "@components/layout/SectionContent";
import React, { Fragment, ReactElement } from "react";
import Button from "@components/button/Button";
import TextInput from "@components/form/TextInput";
import { Controller, UseFieldArrayRemove, useFormContext, UseFormSetValue } from "react-hook-form";
import FormGroup from "@components/form/FormGroup";
import CheckBox from "@components/form/CheckBox";
import SoittoajanYhteyshenkilot from "./SoittoajanYhteyshenkilot";
import { yhteystietoVirkamiehelleTekstiksi } from "src/util/kayttajaTransformationUtil";
import { lowerCase } from "lodash";
import { KaannettavaKieli } from "common/kaannettavatKielet";
import { VuorovaikutustilaisuusFormValues } from ".";
import { TilaisuudenNimiJaAika } from "./TilaisuudenNimiJaAika";
import { Yhteystieto } from "@services/api";
import useTranslation from "next-translate/useTranslation";

interface Props {
  key: number;
  index: number;
  ensisijainenKaannettavaKieli: KaannettavaKieli | null;
  toissijainenKaannettavaKieli: KaannettavaKieli | null;
  setValue: UseFormSetValue<VuorovaikutustilaisuusFormValues>;
  remove: UseFieldArrayRemove;
  mostlyDisabled: boolean | undefined;
  projektiHenkilot: (Yhteystieto & {
    kayttajatunnus: string;
  })[];
}

export default function Soittoaika({
  index,
  ensisijainenKaannettavaKieli,
  toissijainenKaannettavaKieli,
  remove,
  mostlyDisabled,
  key,
  projektiHenkilot,
}: Props): ReactElement {
  const {
    register,
    formState: { errors },
    setValue,
    trigger,
    watch,
    control,
  } = useFormContext<VuorovaikutustilaisuusFormValues>();
  const { t } = useTranslation();

  const peruttu = watch(`vuorovaikutusTilaisuudet.${index}.peruttu`);
  return (
    <SectionContent key={key} style={{ position: "relative" }}>
      <TilaisuudenNimiJaAika index={index} mostlyDisabled={mostlyDisabled} peruttu={peruttu} />
      <SectionContent>
        <h4 className="vayla-smallest-title">Soittoajassa esitettävät yhteyshenkilöt</h4>
        <p>
          Voit valita soittoajassa esitettäviin yhteystietoihin projektiin tallennetun henkilön tai lisätä uuden yhteystiedon. Projektiin
          tallennettujen henkilöiden yhteystiedot haetaan Projektin henkilöt -sivulle tallennetuista tiedoista.
        </p>
        {projektiHenkilot ? (
          <Controller
            control={control}
            name={`vuorovaikutusTilaisuudet.${index}.esitettavatYhteystiedot.yhteysHenkilot`}
            render={({ field: { onChange, value, ...field } }) => (
              <FormGroup
                label="Projektiin tallennetut henkilöt"
                inlineFlex
                errorMessage={(errors as any)?.vuorovaikutusTilaisuudet?.[index]?.esitettavatYhteystiedot?.message}
              >
                {projektiHenkilot?.map((hlo, index) => {
                  const tunnuslista = value || [];
                  return (
                    <Fragment key={index}>
                      <CheckBox
                        label={yhteystietoVirkamiehelleTekstiksi(hlo, t)}
                        disabled={!!peruttu}
                        onChange={(event) => {
                          if (!event.target.checked) {
                            onChange(tunnuslista.filter((tunnus) => tunnus !== hlo.kayttajatunnus));
                          } else {
                            onChange([...tunnuslista, hlo.kayttajatunnus]);
                          }
                        }}
                        checked={tunnuslista.includes(hlo.kayttajatunnus)}
                        {...field}
                      />
                    </Fragment>
                  );
                })}
              </FormGroup>
            )}
          />
        ) : (
          <p>Projektilla ei ole tallennettuja henkilöitä</p>
        )}
      </SectionContent>
      <SoittoajanYhteyshenkilot tilaisuusIndex={index} disabled={!!peruttu} />
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
