import React, { ReactElement, useEffect, useState } from "react";
import { Projekti } from "@services/api";
import styles from "@styles/projekti/ProjektiPerustiedot.module.css";
import RadioButton from "@components/form/RadioButton";
import TextInput from "@components/form/TextInput";
import Select from "@components/form/Select";
import { Controller, useFormContext } from "react-hook-form";
import { FormValues } from "@pages/yllapito/projekti/[oid]";
import FileInput from "@components/form/FileInput";
import IconButton from "@components/button/IconButton";
import FormGroup from "@components/form/FormGroup";
import { maxPhoneLength } from "src/schemas/puhelinNumero";
import classNames from "classnames";

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
    setLogoUrl((projekti?.suunnitteluSopimus?.logo && "/" + projekti?.suunnitteluSopimus?.logo) || undefined);
  }, [projekti]);

  return (
    <>
      <h4 className="vayla-small-title">Suunnittelusopimus</h4>
      <FormGroup label="Onko kyseessä suunnittelusopimuksella toteutettava suunnitteluhanke? *" flexDirection="row">
        <RadioButton
          label="Kyllä"
          name="suunnittelusopimushanke"
          value="true"
          checked={hasSuunnittaluSopimus}
          onChange={() => {
            setHasSuunnitteluSopimus(true);
          }}
          id="suunnittelusopimushanke_kylla"
        ></RadioButton>
        <RadioButton
          label="Ei"
          name="suunnittelusopimushanke"
          value="false"
          checked={!hasSuunnittaluSopimus}
          onChange={() => {
            setHasSuunnitteluSopimus(false);
          }}
          id="suunnittelusopimushanke_ei"
        ></RadioButton>
      </FormGroup>
      {hasSuunnittaluSopimus && (
        <div className={classNames(styles.cell, "indent")}>
          <p>Kunnan projektipäällikön tiedot</p>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-6 lg:pr-1 relative">
            <div className="lg:col-span-4">
              <Select
                label="Kunta *"
                options={kuntaOptions ? kuntaOptions : [{ label: "", value: "" }]}
                error={(errors as any).suunnitteluSopimus?.kunta}
                {...register("suunnitteluSopimus.kunta", { shouldUnregister: true })}
              />
            </div>
            <div className="lg:col-span-4">
              <TextInput
                label="Etunimi *"
                error={(errors as any).suunnitteluSopimus?.etunimi}
                {...register("suunnitteluSopimus.etunimi", { shouldUnregister: true })}
              />
            </div>
            <div className="lg:col-span-4">
              <TextInput
                label="Sukunimi *"
                error={(errors as any).suunnitteluSopimus?.sukunimi}
                {...register("suunnitteluSopimus.sukunimi", { shouldUnregister: true })}
              />
            </div>
            <div className="lg:col-span-4">
              <TextInput
                label="Puhelinnumero *"
                maxLength={maxPhoneLength}
                error={(errors as any).suunnitteluSopimus?.puhelinnumero}
                {...register("suunnitteluSopimus.puhelinnumero", { shouldUnregister: true })}
              />
            </div>
            <div className="lg:col-span-4">
              <TextInput
                label="Sähköposti *"
                error={(errors as any).suunnitteluSopimus?.email}
                {...register("suunnitteluSopimus.email", { shouldUnregister: true })}
              />
            </div>
          </div>
          <Controller
            render={({ field }) =>
              logoUrl ? (
                <FormGroup
                  label="Virallinen, kunnalta saatu logo. *"
                  errorMessage={(errors as any).suunnitteluSopimus?.logo?.message}
                >
                  <div className="flex flex-row">
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
                  </div>
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
        </div>
      )}
    </>
  );
}
