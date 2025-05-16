import React, { ReactElement, useEffect, useState } from "react";
import { Controller, useFormContext, UseFormWatch } from "react-hook-form";
import { FormValues } from "@pages/yllapito/projekti/[oid]";
import FormGroup from "@components/form/FormGroup";
import SectionContent from "@components/layout/SectionContent";
import HassuGrid from "@components/HassuGrid";
import TextInput from "@components/form/TextInput";
import { FormControlLabel, Radio, RadioGroup, IconButton, SvgIcon } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { H4 } from "@components/Headings";
import HenkiloLista from "./SuunnittelusopimusHenkilolista";
import { KaannettavaKieli } from "common/kaannettavatKielet";
import ProjektiSuunnittelusopimusLogoInput from "./ProjektiSuunnittelusopimusLogoInput";
import { Kieli, Projekti } from "@services/api";
import OsapuolenPoistoDialog from "../common/OsapuolenPoistoDialog";

interface SuunnittelusopimusOsapuoliProps {
  osapuoliNumero: number;
  formDisabled?: boolean;
  disabled: boolean;
  ensisijainenKaannettavaKieli?: KaannettavaKieli;
  toissijainenKaannettavaKieli?: KaannettavaKieli;
  watch: UseFormWatch<FormValues>;
  poistaOsapuoli?: () => void;
  onViimeinenOsapuoli?: boolean;
  projekti?: Projekti | null;
}

export default function SuunnittelusopimusOsapuoli({
  osapuoliNumero,
  formDisabled,
  disabled,
  ensisijainenKaannettavaKieli,
  toissijainenKaannettavaKieli,
  watch,
  poistaOsapuoli,
  projekti,
}: SuunnittelusopimusOsapuoliProps): ReactElement {
  const {
    register,
    formState: { errors },
    control,
    getValues,
    setValue,
  } = useFormContext<FormValues>();

  const [OsapuoltenPoistoDialogOpen, setOsapuolenPoistoDialogOpen] = useState(false);

  const avaaVahvistusdialogi = () => {
    setOsapuolenPoistoDialogOpen(true);
  };

  const peruutaPoisto = () => {
    setOsapuolenPoistoDialogOpen(false);
  };

  const vahvistaPoisto = () => {
    if (poistaOsapuoli) {
      poistaOsapuoli();
    }
    setOsapuolenPoistoDialogOpen(false);
  };

  const suunnittelusopimus = watch("suunnittelusopimusprojekti");

  useEffect(() => {
    if (!projekti) return;
    if (suunnittelusopimus === "true" && !getValues("suunnitteluSopimus.osapuoliMaara" as any)) {
      setValue("suunnitteluSopimus.osapuoliMaara" as any, 1);
    }
  }, [suunnittelusopimus, getValues, setValue, projekti]);

  useEffect(() => {
    const tyyppiArvo = getValues(`suunnitteluSopimus.osapuoli${osapuoliNumero}Tyyppi` as any);
    if (!tyyppiArvo) {
      setValue(`suunnitteluSopimus.osapuoli${osapuoliNumero}Tyyppi` as any, "kunta");
    }
  }, [osapuoliNumero, getValues, setValue]);

  const osapuoliTyyppiValue = watch(`suunnitteluSopimus.osapuoli${osapuoliNumero}Tyyppi` as any);
  const osapuoliTyyppi = Array.isArray(osapuoliTyyppiValue) ? osapuoliTyyppiValue[0]?.toString() : osapuoliTyyppiValue?.toString();

  const getFieldError = (fieldPath: string) => {
    const parts = fieldPath.split(".");
    let current: any = errors;

    for (const part of parts) {
      if (!current || typeof current !== "object") return undefined;
      current = current[part];
    }

    return current;
  };

  const fieldPath = (field: string) => `suunnitteluSopimus.osapuoli${osapuoliNumero}.${field}` as const as keyof FormValues;

  const hasRuotsi = ensisijainenKaannettavaKieli === Kieli.RUOTSI || toissijainenKaannettavaKieli === Kieli.RUOTSI;

  return (
    <SectionContent largeGaps sx={{ marginTop: 15, marginLeft: 10 }}>
      <SectionContent>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <H4>{osapuoliNumero}. osapuoli</H4>
          {poistaOsapuoli && (
            <IconButton
              onClick={avaaVahvistusdialogi}
              disabled={disabled}
              size="large"
              type="button"
              style={{
                padding: 0,
                marginLeft: "10px",
                height: "fit-content",
                display: "flex",
                alignItems: "center",
              }}
            >
              <SvgIcon>
                <FontAwesomeIcon icon="trash" />
              </SvgIcon>
            </IconButton>
          )}
        </div>
        <OsapuolenPoistoDialog dialogiOnAuki={OsapuoltenPoistoDialogOpen} onClose={peruutaPoisto} onAccept={vahvistaPoisto} />

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

        {(osapuoliTyyppi === "kunta" || osapuoliTyyppi === "yritys") && (
          <HassuGrid cols={{ lg: 3 }}>
            <TextInput
              label="Osapuolen nimi suomeksi *"
              {...register(`suunnitteluSopimus.osapuoli${osapuoliNumero}.osapuolenNimiFI` as any)}
              error={getFieldError(fieldPath("osapuolenNimiFI"))}
              disabled={formDisabled}
            />
            {hasRuotsi && (
              <TextInput
                label="Osapuolen nimi ruotsiksi *"
                {...register(`suunnitteluSopimus.osapuoli${osapuoliNumero}.osapuolenNimiSV` as any)}
                error={getFieldError(fieldPath("osapuolenNimiSV"))}
                disabled={formDisabled}
              />
            )}
          </HassuGrid>
        )}

        <HenkiloLista
          key={`henkilo-lista-osapuoli-${osapuoliNumero}-${Date.now()}`}
          osapuoliNumero={osapuoliNumero}
          osapuoliTyyppi={osapuoliTyyppi || "kunta"}
          projekti={projekti}
        />
        <SectionContent largeGaps sx={{ marginTop: 15, marginLeft: 8 }}>
          <H4>{osapuoliTyyppi === "kunta" ? "Kunnan" : "Yrityksen"} logo</H4>
          {ensisijainenKaannettavaKieli && (
            <ProjektiSuunnittelusopimusLogoInput<FormValues>
              lang={ensisijainenKaannettavaKieli}
              isPrimaryLang
              name={`suunnitteluSopimus.osapuoli${osapuoliNumero}.osapuolenLogo.${ensisijainenKaannettavaKieli}` as any}
              disabled={formDisabled}
            />
          )}
          {toissijainenKaannettavaKieli && (
            <ProjektiSuunnittelusopimusLogoInput<FormValues>
              lang={toissijainenKaannettavaKieli}
              isPrimaryLang={false}
              name={`suunnitteluSopimus.osapuoli${osapuoliNumero}.osapuolenLogo.${toissijainenKaannettavaKieli}` as any}
              disabled={formDisabled}
            />
          )}
        </SectionContent>
      </SectionContent>
    </SectionContent>
  );
}
