import React, { ReactElement, useEffect, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { FormValues } from "@pages/yllapito/projekti/[oid]";
import FormGroup from "@components/form/FormGroup";
import { Kieli } from "../../../common/graphql/apiModel";
import HassuStack from "@components/layout/HassuStack";
import IconButton from "@components/button/IconButton";
import FileInput from "@components/form/FileInput";
import { KaannettavaKieli } from "common/kaannettavatKielet";

interface Props {
  lang: KaannettavaKieli;
  isPrimaryLang: boolean;
  logoUrl: string | undefined;
  disabled?: boolean;
}
export default function ProjektiEuRahoitusLogoInput({ isPrimaryLang, lang, disabled, logoUrl }: Props): ReactElement {
  const { control } = useFormContext<FormValues>();

  const [langPriorityLabel, setLangPriorityLabel] = useState("");

  useEffect(() => {
    if (isPrimaryLang) {
      setLangPriorityLabel("ensisijaisella kielellä ");
    } else {
      setLangPriorityLabel("toissijaisella kielellä ");
    }
  }, [lang, isPrimaryLang]);

  // @ts-ignore
  return (
    <Controller
      render={({ field, fieldState }) =>
        field.value ? (
          <FormGroup errorMessage={fieldState.error?.message}>
            <p>
              Virallinen EU-rahoituksen logo suunnitelman {langPriorityLabel} (<b>{lang.toLowerCase()}</b>). *
            </p>
            <HassuStack direction="row">
              <img className="h-11 border-gray border mb-3.5 py-2 px-3" src={logoUrl} alt="Eu-rahoitus logo" />
              <IconButton
                name={"eu_logo_trash_button_" + lang}
                icon="trash"
                type="button"
                disabled={disabled}
                onClick={() => {
                  field.onChange(null);
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
              error={fieldState.error}
              onDrop={(files) => {
                const logoTiedosto = files[0];
                if (logoTiedosto) {
                  field.onChange(logoTiedosto);
                }
              }}
              bottomInfoText="Tuetut tiedostomuodot ovat JPEG ja PNG. Sallittu tiedostokoko on maksimissaan 25 Mt."
              disabled={disabled}
              onChange={(e) => {
                const logoTiedosto = e.target.files?.[0];
                if (logoTiedosto) {
                  field.onChange(logoTiedosto);
                }
              }}
            />
          </span>
        )
      }
      name={lang === Kieli.SUOMI ? "euRahoitusLogot.SUOMI" : "euRahoitusLogot.RUOTSI"}
      control={control}
      defaultValue={null}
    />
  );
}
