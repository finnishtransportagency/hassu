import { yupResolver } from "@hookform/resolvers/yup";
import { Aineisto, AineistoInput, TallennaProjektiInput } from "@services/api";
import React, { useEffect } from "react";
import { UseFormProps, useForm, FormProvider } from "react-hook-form";
import { useProjekti } from "src/hooks/useProjekti";
import { nahtavillaoloAineistotSchema } from "src/schemas/nahtavillaoloAineistot";
import HyvaksymisVaihePainikkeet from "./HyvaksymisVaihePainikkeet";
import Hyvaksymispaatos from "./Hyvaksymispaatos";
import SuunnitelmatJaAineistot from "../../common/SuunnitelmatJaAineistot";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import { aineistoKategoriat } from "common/aineistoKategoriat";

interface AineistoNahtavilla {
  [kategoriaId: string]: AineistoInput[];
}

type FormData = {
  aineistoNahtavilla: AineistoNahtavilla;
  hyvaksymisPaatos: AineistoInput[];
};

export type HyvaksymisVaiheAineistotFormValues = Pick<TallennaProjektiInput, "oid"> & FormData;

const getDefaultValueForAineistoNahtavilla = (aineistot: Aineisto[] | undefined | null) => {
  return aineistoKategoriat.listKategoriaIds().reduce<AineistoNahtavilla>((aineistoNahtavilla, currentKategoriaId) => {
    aineistoNahtavilla[currentKategoriaId] =
      aineistot
        ?.filter((aineisto) => aineisto.kategoriaId === currentKategoriaId)
        .map<AineistoInput>((aineisto) => ({
          dokumenttiOid: aineisto.dokumenttiOid,
          nimi: aineisto.nimi,
          jarjestys: aineisto.jarjestys,
          kategoriaId: aineisto.kategoriaId,
        })) || [];
    return aineistoNahtavilla;
  }, {});
};

function defaultValues(projekti: ProjektiLisatiedolla): HyvaksymisVaiheAineistotFormValues {
  const hyvaksymisPaatos: AineistoInput[] =
    projekti.hyvaksymisVaihe?.hyvaksymisPaatos?.map(({ dokumenttiOid, nimi, jarjestys }) => ({
      dokumenttiOid,
      jarjestys,
      nimi,
    })) || [];

  return {
    oid: projekti.oid,
    aineistoNahtavilla: getDefaultValueForAineistoNahtavilla(projekti.hyvaksymisVaihe?.aineistoNahtavilla),
    hyvaksymisPaatos,
  };
}

export default function Muokkausnakyma() {
  const { data: projekti } = useProjekti();

  const formOptions: UseFormProps<HyvaksymisVaiheAineistotFormValues> = {
    resolver: yupResolver(nahtavillaoloAineistotSchema, { abortEarly: false, recursive: true }),
    mode: "onChange",
    reValidateMode: "onChange",
  };

  const useFormReturn = useForm<HyvaksymisVaiheAineistotFormValues>(formOptions);
  const { reset } = useFormReturn;

  useEffect(() => {
    if (projekti?.oid) {
      const tallentamisTiedot = defaultValues(projekti);
      reset(tallentamisTiedot);
    }
  }, [projekti, reset]);

  return (
    <FormProvider {...useFormReturn}>
      Tekstiä tähän
      <form>
        <Hyvaksymispaatos />
        <SuunnitelmatJaAineistot />
        <HyvaksymisVaihePainikkeet />
      </form>
    </FormProvider>
  );
}
