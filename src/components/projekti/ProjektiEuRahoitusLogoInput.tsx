import React, { ReactElement, useEffect, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { FormValues } from "@pages/yllapito/projekti/[oid]";
import FormGroup from "@components/form/FormGroup";
import { Projekti } from "../../../common/graphql/apiModel";
import HassuStack from "@components/layout/HassuStack";
import IconButton from "@components/button/IconButton";
import FileInput from "@components/form/FileInput";

interface Props {
  projekti?: Projekti | null;
}
export default function ProjektiEuRahoitusLogoInput({ projekti }: Props): ReactElement {
  const {
    formState: { errors },
    control,
  } = useFormContext<FormValues>();

  const [logoFIUrl, setLogoFIUrl] = useState<string | undefined>(undefined);

  //console.log(logoUrl);
  useEffect(() => {
    setLogoFIUrl(projekti?.euRahoitusLogot?.logoFI || undefined);
  }, [projekti]);

  function setLogoUrl(url: string | undefined, lang: number) {
    console.log("setLogoUrl");
    console.log(url);
    console.log(lang);
  }

  return (
    <Controller
      render={({ field }) =>
        logoFIUrl ? (
          <FormGroup label="" errorMessage={(errors as any).euRahoitusLogot?.logoFI.message}>
            <HassuStack direction="row">
              <img className="h-11 border-gray border mb-3.5 py-2 px-3" src={logoFIUrl} alt="Eu-rahoitus logo" />
              <IconButton
                name="eu_logo_trash_button"
                icon="trash"
                onClick={() => {
                  setLogoUrl(undefined, 1);
                }}
              />
            </HassuStack>
          </FormGroup>
        ) : (
          <FileInput
            label={"Virallinen EU-rahoituksen logo suunnitelman ensisijaisella kielellä (suomi)"}
            error={(errors as any).euRahoitusLogot?.logo.message}
            onDrop={(files) => {
              const logoFITiedosto = files[0];
              if (logoFITiedosto) {
                setLogoUrl(URL.createObjectURL(logoFITiedosto), 1);
                field.onChange(logoFITiedosto);
              }
            }}
            bottomInfoText="Tuetut tiedostomuodot ovat JPG ja PNG. Sallittu tiedostokoko on maksimissaan 25Mt."
            onChange={(e) => {
              const logoTiedosto = e.target.files?.[0];
              if (logoTiedosto) {
                setLogoFIUrl(URL.createObjectURL(logoTiedosto));
                field.onChange(logoTiedosto);
              }
            }}
          />
        )
      }
      name="euRahoitusLogot"
      control={control}
      defaultValue={undefined}
      shouldUnregister
    />
  );
}
