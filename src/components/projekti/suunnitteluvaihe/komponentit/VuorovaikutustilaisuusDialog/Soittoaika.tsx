import SectionContent from "@components/layout/SectionContent";
import React, { Fragment, ReactElement } from "react";
import Button from "@components/button/Button";
import { Controller, UseFieldArrayRemove, useFormContext, UseFormSetValue } from "react-hook-form";
import FormGroup from "@components/form/FormGroup";
import SoittoajanYhteyshenkilot from "./SoittoajanYhteyshenkilot";
import { yhteystietoVirkamiehelleTekstiksi } from "src/util/kayttajaTransformationUtil";
import { KaannettavaKieli } from "hassu-common/kaannettavatKielet";
import { VuorovaikutusSectionContent, VuorovaikutustilaisuusFormValues } from ".";
import TilaisuudenNimiJaAika from "./TilaisuudenNimiJaAika";
import { VuorovaikutusTilaisuusTyyppi, Yhteystieto } from "@services/api";
import useTranslation from "next-translate/useTranslation";
import Lisatiedot from "./Lisatiedot";
import { Checkbox, FormControlLabel } from "@mui/material";

interface Props {
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
  projektiHenkilot,
}: Props): ReactElement {
  const {
    formState: { errors },
    setValue,
    watch,
    control,
  } = useFormContext<VuorovaikutustilaisuusFormValues>();
  const { t } = useTranslation();

  const peruttu = watch(`vuorovaikutusTilaisuudet.${index}.peruttu`);
  return (
    <VuorovaikutusSectionContent style={{ position: "relative" }}>
      <TilaisuudenNimiJaAika index={index} mostlyDisabled={mostlyDisabled} peruttu={peruttu} />
      <Lisatiedot
        tilaisuustyyppi={VuorovaikutusTilaisuusTyyppi.SOITTOAIKA}
        ensisijainenKaannettavaKieli={ensisijainenKaannettavaKieli}
        toissijainenKaannettavaKieli={toissijainenKaannettavaKieli}
        index={index}
      />
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
                {projektiHenkilot?.map((hlo) => {
                  const tunnuslista = value || [];
                  return (
                    <Fragment key={hlo.kayttajatunnus}>
                      <FormControlLabel
                        sx={{ marginLeft: "0px" }}
                        label={yhteystietoVirkamiehelleTekstiksi(hlo, t)}
                        control={
                          <Checkbox
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
                        }
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
