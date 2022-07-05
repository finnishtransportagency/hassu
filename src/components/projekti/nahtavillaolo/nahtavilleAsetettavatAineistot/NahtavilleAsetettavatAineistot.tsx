import { yupResolver } from "@hookform/resolvers/yup";
import { Aineisto, AineistoInput, TallennaProjektiInput } from "@services/api";
import React, { useEffect } from "react";
import { UseFormProps, useForm, FormProvider } from "react-hook-form";
import { useProjekti } from "src/hooks/useProjekti";
import { nahtavillaoloAineistotSchema } from "src/schemas/nahtavillaoloAineistot";
import NahtavillaoloPainikkeet from "./NahtavillaoloPainikkeet";
import LausuntopyyntoonLiitettavaLisaaineisto from "./LausuntopyyntoonLiitettavaLisaaineisto";
import SuunnitelmatJaAineistot from "./SuunnitelmatJaAineistot";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import { AineistoKategoria, aineistoKategoriat } from "common/aineistoKategoriat";

type Aineistot = {
  aineistoNahtavilla: {
    [kategoriaId: string]: AineistoInput[];
  };
  lisaAineisto: AineistoInput[];
};

export type NahtavilleAsetettavatAineistotFormValues = Pick<TallennaProjektiInput, "oid"> & Aineistot;

const addAineistoKategoria = (
  aineistoNahtavilla: Aineistot["aineistoNahtavilla"],
  kategoria: AineistoKategoria,
  allAineisto: Aineisto[] | undefined | null
) => {
  const aineisto: Aineisto[] = allAineisto?.filter(({ kategoriaId }) => kategoriaId === kategoria.id) || [];
  aineistoNahtavilla[kategoria.id] = aineisto.map<AineistoInput>(({ dokumenttiOid, jarjestys, nimi, kategoriaId }) => ({
    dokumenttiOid,
    nimi,
    jarjestys,
    kategoriaId,
  }));
  // Uncomment to add alakategoriat recursively
  // kategoria.alaKategoriat?.forEach((k) => addAineistoKategoria(aineistoNahtavilla, k));
};

function defaultValues(projekti: ProjektiLisatiedolla): NahtavilleAsetettavatAineistotFormValues {
  const aineistoNahtavilla = aineistoKategoriat
    .listKategoriat()
    .reduce<Aineistot["aineistoNahtavilla"]>((aineistot, currentKategoria) => {
      addAineistoKategoria(aineistot, currentKategoria, projekti.nahtavillaoloVaihe?.aineistoNahtavilla);
      return aineistot;
    }, {});

  const lisaAineisto: AineistoInput[] =
    projekti.nahtavillaoloVaihe?.lisaAineisto?.map(({ dokumenttiOid, nimi, jarjestys }) => ({
      dokumenttiOid,
      jarjestys,
      nimi,
    })) || [];

  return {
    oid: projekti.oid,
    aineistoNahtavilla,
    lisaAineisto,
  };
}

export default function NahtavilleAsetettavatAineistot() {
  const { data: projekti } = useProjekti();

  const formOptions: UseFormProps<NahtavilleAsetettavatAineistotFormValues> = {
    resolver: yupResolver(nahtavillaoloAineistotSchema, { abortEarly: false, recursive: true }),
    mode: "onChange",
    reValidateMode: "onChange",
  };

  const useFormReturn = useForm<NahtavilleAsetettavatAineistotFormValues>(formOptions);
  const { reset } = useFormReturn;

  useEffect(() => {
    if (projekti?.oid) {
      const tallentamisTiedot = defaultValues(projekti);
      console.log({ tallentamisTiedot });
      reset(tallentamisTiedot);
    }
  }, [projekti, reset]);

  return (
    <FormProvider {...useFormReturn}>
      <form>
        <SuunnitelmatJaAineistot />
        <LausuntopyyntoonLiitettavaLisaaineisto />
        <NahtavillaoloPainikkeet />
      </form>
    </FormProvider>
  );
}
