import React, { Dispatch, ReactElement, useEffect, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { FormValues } from "@pages/yllapito/projekti/[oid]";
import FormGroup from "@components/form/FormGroup";
import { Kieli, Projekti } from "../../../common/graphql/apiModel";
import HassuStack from "@components/layout/HassuStack";
import IconButton from "@components/button/IconButton";
import FileInput from "@components/form/FileInput";

interface Props {
  projekti?: Projekti | null;
  lang: Kieli;
  isPrimaryLang: boolean;

  setLogoUrl: Dispatch<React.SetStateAction<string | undefined>>;
  logoUrl: string | undefined;
  logoField: "euRahoitusLogot.logoFI" | "euRahoitusLogot.logoSV";
}
export default function ProjektiEuRahoitusLogoInput({
  projekti,
  isPrimaryLang,
  lang,
  setLogoUrl,
  logoUrl,
  logoField,
}: Props): ReactElement {
  const {
    formState: { errors },
    control,
    setValue,
  } = useFormContext<FormValues>();

  const [logoLabel, setLogoLabel] = useState("");

  useEffect(() => {
    if (lang === Kieli.SUOMI) {
      setLogoUrl(projekti?.euRahoitusLogot?.logoFI || undefined);
    } else {
      setLogoUrl(projekti?.euRahoitusLogot?.logoSV || undefined);
    }
  }, [projekti, lang]);

  useEffect(() => {
    const logoLabelPrefix = "Virallinen EU-rahoituksen logo suunnitelman ";
    if (isPrimaryLang) {
      setLogoLabel(logoLabelPrefix + "ensisijaisella kielellä (" + lang.toLowerCase() + "). *");
    } else {
      setLogoLabel(logoLabelPrefix + "toissijaisella kielellä (" + lang.toLowerCase() + "). *");
    }
  }, [projekti, lang, isPrimaryLang]);

  // @ts-ignore
  return (
    <Controller
      render={({ field }) =>
        logoUrl ? (
          <FormGroup label={logoLabel} errorMessage={(errors as any).euRahoitusLogot?.logoFI.message}>
            <HassuStack direction="row">
              <img className="h-11 border-gray border mb-3.5 py-2 px-3" src={logoUrl} alt="Eu-rahoitus logo" />
              <IconButton
                name="eu_logo_trash_button"
                icon="trash"
                onClick={() => {
                  setLogoUrl(undefined);
                  setValue(logoField, undefined);
                }}
              />
            </HassuStack>
          </FormGroup>
        ) : (
          <FileInput
            label={logoLabel}
            error={(errors as any).euRahoitusLogot?.logo.message}
            onDrop={(files) => {
              const logoTiedosto = files[0];
              if (logoTiedosto) {
                setLogoUrl(URL.createObjectURL(logoTiedosto));
                field.onChange(logoTiedosto);
              }
            }}
            bottomInfoText="Tuetut tiedostomuodot ovat JPG ja PNG. Sallittu tiedostokoko on maksimissaan 25Mt."
            onChange={(e) => {
              const logoTiedosto = e.target.files?.[0];
              if (logoTiedosto) {
                setLogoUrl(URL.createObjectURL(logoTiedosto));
                field.onChange(logoTiedosto);
              }
            }}
          />
        )
      }
      name={logoField}
      control={control}
      defaultValue={undefined}
      shouldUnregister
    />
  );
}
