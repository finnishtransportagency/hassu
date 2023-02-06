import React, { ReactElement, useEffect, useState } from "react";
import RadioButton from "@components/form/RadioButton";
import { Controller, useFormContext } from "react-hook-form";
import { FormValues } from "@pages/yllapito/projekti/[oid]";
import FormGroup from "@components/form/FormGroup";
import Section from "@components/layout/Section";
import { Kieli, Projekti } from "../../../common/graphql/apiModel";
import SectionContent from "@components/layout/SectionContent";
import HassuStack from "@components/layout/HassuStack";
import IconButton from "@components/button/IconButton";
import FileInput from "@components/form/FileInput";

interface Props {
  projekti?: Projekti | null;
}
export default function ProjektiEuRahoitusTiedot({ projekti }: Props): ReactElement {
  const {
    formState: { errors },
    getValues,
    control,
  } = useFormContext<FormValues>();

  const [hasEuRahoitus, setHasEuRahoitus] = useState(false);
  const [logoFIUrl, setLogoFIUrl] = useState<string | undefined>(undefined);
  const [logoSVUrl, setLogoSVUrl] = useState<string | undefined>(undefined);

  console.log("hello");
  console.log(getValues("kielitiedot"));
  const lang1 = getValues("kielitiedot.ensisijainenKieli");
  const lang2 = getValues("kielitiedot.toissijainenKieli");
  console.log(lang1);

  console.log(lang1);
  console.log(lang2);

  console.log(hasEuRahoitus);
  console.log(control);
  console.log(logoSVUrl);
  //console.log(logoUrl);
  useEffect(() => {
    setHasEuRahoitus(!!projekti?.euRahoitus);
    setLogoFIUrl(projekti?.euRahoitusLogot?.logoFI || undefined);
    setLogoSVUrl(projekti?.euRahoitusLogot?.logoSV || undefined);
  }, [projekti, setHasEuRahoitus]);

  function setLogoUrl(url: string | undefined, lang: number) {
    console.log("setLogoUrl");
    console.log(url);
    console.log(lang);
    if (lang2Selected) {
      console.log("lang2Selected");
    }
  }

  return (
    <Section smallGaps>
      <h4 className="vayla-small-title">EU-rahoitus</h4>

      <FormGroup label="Rahoittaako EU suunnitteluhanketta? *" errorMessage={errors?.euRahoitus?.message} flexDirection="row">
        <RadioButton
          label="Kyllä"
          value="true"
          onChange={() => {
            setHasEuRahoitus(true);
          }}
        />
        <RadioButton
          label="Ei"
          value="false"
          onChange={() => {
            setHasEuRahoitus(false);
          }}
        />
      </FormGroup>

      {hasEuRahoitus && (
        <SectionContent>
          <h5 className="vayla-smallest-title">EU-rahoituksen logo</h5>
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
                <span>
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
                  <FileInput
                    label="Virallinen EU-rahoituksen logo suunnitelman toissijaisella kielellä ("
                    error={(errors as any).euRahoitusLogot?.logo}
                    onDrop={(files) => {
                      const logoFITiedosto = files[0];
                      if (logoFITiedosto) {
                        setLogoFIUrl(URL.createObjectURL(logoFITiedosto));
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
                </span>
              )
            }
            name="euRahoitusLogot"
            control={control}
            defaultValue={undefined}
            shouldUnregister
          />
        </SectionContent>
      )}
    </Section>
  );
}
