import React, { ReactElement, useEffect, useState } from "react";
import { Projekti } from "@services/api";
import RadioButton from "@components/form/RadioButton";
import TextInput from "@components/form/TextInput";
import Select from "@components/form/Select";
import { Controller, useFormContext } from "react-hook-form";
import { FormValues } from "@pages/yllapito/projekti/[oid]";
import FileInput from "@components/form/FileInput";
import IconButton from "@components/button/IconButton";
import FormGroup from "@components/form/FormGroup";
import { maxPhoneLength } from "src/schemas/puhelinNumero";
import Section from "@components/layout/Section";
import HassuGrid from "@components/HassuGrid";
import SectionContent from "@components/layout/SectionContent";
import HassuStack from "@components/layout/HassuStack";

interface Props {
  projekti?: Projekti | null;
  kuntalista?: string[];
}

export default function ProjektiPerustiedot({ projekti }: Props): ReactElement {
  const {
    register,
    formState: { errors },
    control,
    setValue,
  } = useFormContext<FormValues>();

  const [hasSuunnittaluSopimus, setHasSuunnitteluSopimus] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const [kuntaOptions, setKuntaOptions] = useState([]);

  const getKuntaLista = async () => {
    const list = await (await fetch("/api/kuntalista.json")).json();
    setKuntaOptions(list);
  };

  useEffect(() => {
    getKuntaLista();
    setHasSuunnitteluSopimus(!!projekti?.suunnitteluSopimus);
    setLogoUrl(projekti?.suunnitteluSopimus?.logo || undefined);
  }, [projekti]);

  return (
    <Section smallGaps>
      <h4 className="vayla-small-title">Suunnittelusopimus</h4>
      <FormGroup
        label="Onko kyseessä suunnittelusopimuksella toteutettava suunnitteluhanke? *"
        flexDirection="row"
        errorMessage={errors.suunnittelusopimusprojekti?.message}
      >
        <RadioButton
          label="Kyllä"
          value="true"
          {...register("suunnittelusopimusprojekti")}
          onChange={() => {
            setHasSuunnitteluSopimus(true);
          }}
        />
        <RadioButton
          label="Ei"
          value="false"
          {...register("suunnittelusopimusprojekti")}
          onChange={() => {
            setHasSuunnitteluSopimus(false);
          }}
        />
      </FormGroup>
      {hasSuunnittaluSopimus && (
        <SectionContent largeGaps sx={{ marginLeft: 4 }}>
          <SectionContent>
            <p>Kunnan projektipäällikön tiedot</p>
            <HassuGrid cols={{ lg: 3 }}>
              <Select
                label="Kunta *"
                options={kuntaOptions ? kuntaOptions : [{ label: "", value: "" }]}
                error={(errors as any).suunnitteluSopimus?.kunta}
                {...register("suunnitteluSopimus.kunta", { shouldUnregister: true })}
              />
              <TextInput
                label="Etunimi *"
                error={(errors as any).suunnitteluSopimus?.etunimi}
                {...register("suunnitteluSopimus.etunimi", { shouldUnregister: true })}
              />
              <TextInput
                label="Sukunimi *"
                error={(errors as any).suunnitteluSopimus?.sukunimi}
                {...register("suunnitteluSopimus.sukunimi", { shouldUnregister: true })}
              />
              <TextInput
                label="Puhelinnumero *"
                maxLength={maxPhoneLength}
                error={(errors as any).suunnitteluSopimus?.puhelinnumero}
                {...register("suunnitteluSopimus.puhelinnumero", { shouldUnregister: true })}
              />
              <TextInput
                label="Sähköposti *"
                error={(errors as any).suunnitteluSopimus?.email}
                {...register("suunnitteluSopimus.email", { shouldUnregister: true })}
              />
            </HassuGrid>
          </SectionContent>
          <SectionContent>
            <Controller
              render={({ field }) =>
                logoUrl ? (
                  <FormGroup
                    label="Virallinen, kunnalta saatu logo. *"
                    errorMessage={(errors as any).suunnitteluSopimus?.logo?.message}
                  >
                    <HassuStack direction="row">
                      <img
                        className="h-11 border-gray border mb-3.5 py-2 px-3"
                        src={logoUrl}
                        alt="Suunnittelu sopimus logo"
                      />
                      <IconButton
                        icon="trash"
                        onClick={() => {
                          setLogoUrl(undefined);
                          // @ts-ignore
                          setValue("suunnitteluSopimus.logo", undefined);
                        }}
                      />
                    </HassuStack>
                  </FormGroup>
                ) : (
                  <FileInput
                    label="Virallinen, kunnalta saatu logo. *"
                    error={(errors as any).suunnitteluSopimus?.logo}
                    onDrop={(files) => {
                      const logoTiedosto = files[0];
                      if (logoTiedosto) {
                        setLogoUrl(URL.createObjectURL(logoTiedosto));
                        field.onChange(logoTiedosto);
                      }
                    }}
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
              name="suunnitteluSopimus.logo"
              control={control}
              defaultValue={undefined}
              shouldUnregister
            />
          </SectionContent>
        </SectionContent>
      )}
    </Section>
  );
}
