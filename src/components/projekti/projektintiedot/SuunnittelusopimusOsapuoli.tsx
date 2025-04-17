import React, { ReactElement } from "react";
import { Controller, useFormContext, UseFormWatch } from "react-hook-form";
import { FormValues } from "@pages/yllapito/projekti/[oid]";
import FormGroup from "@components/form/FormGroup";
import SectionContent from "@components/layout/SectionContent";
import HassuGrid from "@components/HassuGrid";
import TextInput from "@components/form/TextInput";
import { FormControlLabel, Radio, RadioGroup, IconButton, SvgIcon } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Projekti } from "@services/api";
import { H4 } from "@components/Headings";
import HenkiloLista from "./SuunnittelusopimusHenkilolista";
import { KaannettavaKieli } from "common/kaannettavatKielet";
import ProjektiSuunnittelusopimusLogoInput from "./ProjektiSuunnittelusopimusLogoInput";

interface SuunnittelusopimusOsapuoliProps {
  osapuoliNumero: number;
  osapuoliTyyppi?: string;
  projekti?: Projekti | null;
  disabled?: boolean;
  formDisabled?: boolean;
  kuntaOptions: { label: string; value: string }[];
  ensisijainenKaannettavaKieli?: KaannettavaKieli;
  toissijainenKaannettavaKieli?: KaannettavaKieli;
  watch: UseFormWatch<FormValues>;
  poistaOsapuoli?: () => void;
  onViimeinenOsapuoli?: boolean;
}

export default function SuunnittelusopimusOsapuoli({
  osapuoliNumero,
  projekti,
  disabled,
  formDisabled,
  kuntaOptions,
  ensisijainenKaannettavaKieli,
  toissijainenKaannettavaKieli,
  watch,
  poistaOsapuoli,
}: SuunnittelusopimusOsapuoliProps): ReactElement {
  const {
    register,
    formState: { errors },
    control,
  } = useFormContext<FormValues>();

  const osapuoliTyyppiValue = watch(`suunnitteluSopimus.osapuoli${osapuoliNumero}Tyyppi` as any);
  const osapuoliTyyppi = Array.isArray(osapuoliTyyppiValue) ? osapuoliTyyppiValue[0]?.toString() : osapuoliTyyppiValue?.toString();

  return (
    <SectionContent largeGaps sx={{ marginTop: 10, marginLeft: 10 }}>
      <SectionContent>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <H4>{osapuoliNumero}. osapuoli</H4>
          <IconButton onClick={poistaOsapuoli} disabled={formDisabled} size="large" type="button">
            <SvgIcon>
              <FontAwesomeIcon icon="trash" />
            </SvgIcon>
          </IconButton>
        </div>

        <Controller
          name={`suunnitteluSopimus.osapuoli${osapuoliNumero}Tyyppi` as any}
          control={control}
          defaultValue="kunta"
          render={({ field: osapuoliField, fieldState: osapuoliState }) => (
            <FormGroup label="Suunnittelusopimuksen osapuoli *" errorMessage={osapuoliState.error?.message} flexDirection="row">
              <RadioGroup
                aria-labelledby={`suunnittelusopimus-osapuoli-tyyppi-${osapuoliNumero}`}
                row
                value={osapuoliField.value}
                onChange={(value) => {
                  osapuoliField.onChange(value.target.value);
                }}
                name={osapuoliField.name}
                onBlur={osapuoliField.onBlur}
                ref={osapuoliField.ref}
              >
                <FormControlLabel value={"kunta"} disabled={formDisabled} control={<Radio />} label="Kunta" />
                <FormControlLabel value={"yritys"} disabled={formDisabled} control={<Radio />} label="Yritys tai muu organisaatio" />
              </RadioGroup>
            </FormGroup>
          )}
        />

        {osapuoliTyyppi === "kunta" ? (
          <HassuGrid cols={{ lg: 3 }}>
            <TextInput
              label="Kunnan nimi ensisijaisella kielellä *"
              {...register(`suunnitteluSopimus.osapuoli${osapuoliNumero}.osapuolenNimiEnsisijainen` as any)}
              error={(errors as any)?.suunnitteluSopimus?.osapuoli?.[osapuoliNumero]?.osapuolenNimiEnsisijainen}
              disabled={formDisabled}
            />
            <TextInput
              label="Kunnan nimi toissijaisella kielellä *"
              {...register(`suunnitteluSopimus.osapuoli${osapuoliNumero}.osapuolenNimiToissijainen` as any)}
              error={(errors as any)?.suunnitteluSopimus?.osapuoli?.[osapuoliNumero]?.osapuolenNimiToissijainen}
              disabled={formDisabled}
            />
          </HassuGrid>
        ) : (
          <HassuGrid cols={{ lg: 3 }}>
            <TextInput
              label="Yrityksen nimi ensisijaisella kielellä *"
              {...register(`suunnitteluSopimus.osapuoli${osapuoliNumero}.osapuolenNimiEnsisijainen` as any)}
              error={(errors as any)?.suunnitteluSopimus?.osapuoli?.[osapuoliNumero]?.osapuolenNimiEnsisijainen}
              disabled={formDisabled}
            />
            <TextInput
              label="Yrityksen nimi toissijaisella kielellä *"
              {...register(`suunnitteluSopimus.osapuoli${osapuoliNumero}.osapuolenNimiToissijainen` as any)}
              error={(errors as any)?.suunnitteluSopimus?.osapuoli?.[osapuoliNumero]?.osapuolenNimiToissijainen}
              disabled={formDisabled}
            />
          </HassuGrid>
        )}

        <HenkiloLista
          osapuoliNumero={osapuoliNumero}
          osapuoliTyyppi={osapuoliTyyppi}
          projekti={projekti}
          formDisabled={disabled}
          kuntaOptions={kuntaOptions}
          watch={watch}
        />
        <SectionContent>
          <H4>Kunnan logo</H4>
          {ensisijainenKaannettavaKieli && (
            <ProjektiSuunnittelusopimusLogoInput<FormValues>
              lang={ensisijainenKaannettavaKieli}
              isPrimaryLang
              name={`suunnitteluSopimus.logo.${ensisijainenKaannettavaKieli}`}
              disabled={formDisabled}
            />
          )}
          {toissijainenKaannettavaKieli && (
            <ProjektiSuunnittelusopimusLogoInput<FormValues>
              lang={toissijainenKaannettavaKieli}
              isPrimaryLang={false}
              name={`suunnitteluSopimus.logo.${toissijainenKaannettavaKieli}`}
              disabled={formDisabled}
            />
          )}
        </SectionContent>
      </SectionContent>
    </SectionContent>
  );
}
