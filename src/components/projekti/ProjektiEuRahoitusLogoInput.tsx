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
  disabled?: boolean;
}
export default function ProjektiEuRahoitusLogoInput({
  projekti,
  isPrimaryLang,
  lang,
  setLogoUrl,
  logoUrl,
  logoField,
  disabled,
}: Props): ReactElement {
  const {
    formState: { errors },
    control,
    setValue,
  } = useFormContext<FormValues>();

  const [langPriorityLabel, setLangPriorityLabel] = useState("");

  useEffect(() => {
    if (lang === Kieli.SUOMI) {
      setLogoUrl(projekti?.euRahoitusLogot?.logoFI || undefined);
      setValue(logoField, projekti?.euRahoitusLogot?.logoFI || undefined);
    } else {
      setLogoUrl(projekti?.euRahoitusLogot?.logoSV || undefined);
      setValue(logoField, projekti?.euRahoitusLogot?.logoSV || undefined);
    }
  }, [projekti, lang, setLogoUrl, setValue, logoField]);

  useEffect(() => {
    if (isPrimaryLang) {
      setLangPriorityLabel("ensisijaisella kielellä ");
    } else {
      setLangPriorityLabel("toissijaisella kielellä ");
    }
  }, [projekti, lang, isPrimaryLang]);

  // @ts-ignore
  return (
    <Controller
      render={({ field }) =>
        logoUrl ? (
          <FormGroup
            errorMessage={
              lang === Kieli.SUOMI ? (errors as any).euRahoitusLogot?.logoFI?.message : (errors as any).euRahoitusLogot?.logoSV?.message
            }
          >
            <p>
              Virallinen EU-rahoituksen logo suunnitelman {langPriorityLabel} (<b>{lang.toLowerCase()}</b>). *
            </p>
            <HassuStack direction="row">
              <img className="h-11 border-gray border mb-3.5 py-2 px-3" src={logoUrl} alt="Eu-rahoitus logo" />
              <IconButton
                name={"eu_logo_trash_button_" + lang}
                icon="trash"
                disabled={disabled}
                onClick={() => {
                  setLogoUrl(undefined);
                  setValue(logoField, undefined);
                }}
              />
            </HassuStack>
          </FormGroup>
        ) : (
          <span>
            <p>
              Virallinen EU-rahoituksen logo suunnitelman {langPriorityLabel} (<b>{lang.toLowerCase()}</b>). *
            </p>
            <FileInput
              maxFiles={1}
              error={lang === Kieli.SUOMI ? (errors as any).euRahoitusLogot?.logoFI : (errors as any).euRahoitusLogot?.logoSV}
              onDrop={(files) => {
                const logoTiedosto = files[0];
                if (logoTiedosto) {
                  setLogoUrl(URL.createObjectURL(logoTiedosto));
                  field.onChange(logoTiedosto);
                }
              }}
              bottomInfoText="Tuetut tiedostomuodot ovat JPEG ja PNG. Sallittu tiedostokoko on maksimissaan 25 Mt."
              disabled={disabled}
              onChange={(e) => {
                const logoTiedosto = e.target.files?.[0];
                if (logoTiedosto) {
                  setLogoUrl(URL.createObjectURL(logoTiedosto));
                  field.onChange(logoTiedosto);
                }
              }}
            />
          </span>
        )
      }
      name={logoField}
      control={control}
      defaultValue={undefined}
      shouldUnregister
    />
  );
}
