import React, { useState, useCallback, useEffect, useMemo } from "react";
import SearchSection from "@components/layout/SearchSection";
import { HakulomakeOtsikko } from "./TyylitellytKomponentit";
import { UseFormProps, useForm, FormProvider } from "react-hook-form";
import TextInput from "@components/form/TextInput";
import Select, { SelectOption } from "@components/form/Select";
import Button from "@components/button/Button";
import { ProjektiTyyppi } from "../../../common/graphql/apiModel";
import { useRouter } from "next/router";

type HakulomakeFormValues = {
  vapaasanahaku: string;
  kunta: string;
  maakunta: string;
  vaylamuoto: string;
};

export default function Hakulomake() {
  const [kuntaOptions, setKuntaOptions] = useState<SelectOption[]>([]);

  const getKuntaLista = useCallback(async () => {
    const list = await (await fetch("/api/kuntalista.json")).json();
    setKuntaOptions(list);
  }, [setKuntaOptions]);

  useEffect(() => {
    getKuntaLista();
  }, [getKuntaLista]);

  const router = useRouter();
  const vapaasanahaku = typeof router.query?.vapaasanahaku === "string" ? router.query.vapaasanahaku : "";
  const kunta =
    kuntaOptions.find((option) => router.query?.kunta === option.value) && typeof router.query?.kunta === "string"
      ? router.query.kunta
      : "";
  const maakunta =
    ([] as SelectOption[]).find((option) => router.query?.maakunta === option.value) && typeof router.query?.maakunta === "string"
      ? router.query.maakunta
      : "";
  const vaylamuoto =
    Object.keys(ProjektiTyyppi).find((option) => router.query?.vaylamuoto === option) && typeof router.query?.vaylamuoto === "string"
      ? router.query.vaylamuoto
      : "";

  const defaultValues: HakulomakeFormValues = useMemo(
    () => ({
      vapaasanahaku,
      kunta,
      maakunta,
      vaylamuoto,
    }),
    [vapaasanahaku, kunta, maakunta, vaylamuoto]
  );

  const formOptions: UseFormProps<HakulomakeFormValues> = {
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues,
  };
  const useFormReturn = useForm<HakulomakeFormValues>(formOptions);
  const {
    register,
    formState: { errors },
    setValue,
    watch,
  } = useFormReturn;

  const nykKuntaArvo = watch("kunta");

  useEffect(() => {
    setValue("vapaasanahaku", defaultValues.vapaasanahaku);
    setValue("kunta", defaultValues.kunta);
    setValue("maakunta", defaultValues.maakunta);
    setValue("vaylamuoto", defaultValues.vaylamuoto);
  }, [setValue, defaultValues, kuntaOptions, nykKuntaArvo]);

  return (
    <SearchSection noDivider>
      <HakulomakeOtsikko>Suunnitelmien haku</HakulomakeOtsikko>
      <FormProvider {...useFormReturn}>
        <form>
          <TextInput label="Vapaasanahaku" {...register("vapaasanahaku")} error={errors?.vapaasanahaku} />
          <Select
            id="kunta"
            label="Kunta"
            options={kuntaOptions ? kuntaOptions : [{ label: "", value: "" }]}
            error={errors?.kunta}
            {...register("kunta", { shouldUnregister: false })}
          />
          <Select
            id="maakunta"
            label="Maakunta"
            options={[{ label: "", value: "" }]}
            error={errors?.maakunta}
            {...register("maakunta", { shouldUnregister: true })}
          />
          <Select
            id="vaylamuoto"
            label="Väylämuoto"
            options={Object.keys(ProjektiTyyppi).map((tyyppi) => ({ label: tyyppi, value: tyyppi }))}
            error={errors?.vaylamuoto}
            {...register("vaylamuoto", { shouldUnregister: false })}
          />
          <Button primary style={{ marginRight: "auto", marginTop: "1em" }} endIcon="search" id="hae" disabled={false}>
            Hae
          </Button>
        </form>
      </FormProvider>
    </SearchSection>
  );
}
