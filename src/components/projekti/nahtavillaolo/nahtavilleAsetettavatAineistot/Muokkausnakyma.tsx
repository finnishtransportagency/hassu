import { yupResolver } from "@hookform/resolvers/yup";
import { Aineisto, AineistoInput, TallennaProjektiInput } from "@services/api";
import React, { ReactElement, useEffect, useMemo } from "react";
import { UseFormProps, useForm, FormProvider } from "react-hook-form";
import { useProjekti } from "src/hooks/useProjekti";
import { nahtavillaoloAineistotSchema } from "src/schemas/nahtavillaoloAineistot";
import NahtavillaoloPainikkeet from "./NahtavillaoloPainikkeet";
import LausuntopyyntoonLiitettavaLisaaineisto from "./LausuntopyyntoonLiitettavaLisaaineisto";
import SuunnitelmatJaAineistot from "../../common/SuunnitelmatJaAineistot";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import { aineistoKategoriat } from "common/aineistoKategoriat";
import useLeaveConfirm from "src/hooks/useLeaveConfirm";

interface AineistoNahtavilla {
  [kategoriaId: string]: AineistoInput[];
}

type FormData = {
  aineistoNahtavilla: AineistoNahtavilla;
  lisaAineisto: AineistoInput[];
};

export type NahtavilleAsetettavatAineistotFormValues = Pick<TallennaProjektiInput, "oid"> & FormData;

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

interface Props {
  setIsDirty: (value: React.SetStateAction<boolean>) => void;
}

export default function Muokkausnakyma({ setIsDirty }: Props): ReactElement {
  const { data: projekti } = useProjekti({ revalidateOnMount: true });
  return <>{projekti && <MuokkausnakymaLomake setIsDirty={setIsDirty} projekti={projekti} />}</>;
}

interface MuokkausnakymaLomakeProps {
  projekti: ProjektiLisatiedolla;
}

function MuokkausnakymaLomake({ projekti, setIsDirty }: MuokkausnakymaLomakeProps & Props) {
  const defaultValues: NahtavilleAsetettavatAineistotFormValues = useMemo(() => {
    const lisaAineisto: AineistoInput[] =
      projekti.nahtavillaoloVaihe?.lisaAineisto?.map(({ dokumenttiOid, nimi, jarjestys }) => ({
        dokumenttiOid,
        jarjestys,
        nimi,
      })) || [];

    return {
      oid: projekti.oid,
      aineistoNahtavilla: getDefaultValueForAineistoNahtavilla(projekti.nahtavillaoloVaihe?.aineistoNahtavilla),
      lisaAineisto,
    };
  }, [projekti]);

  const formOptions: UseFormProps<NahtavilleAsetettavatAineistotFormValues> = {
    resolver: yupResolver(nahtavillaoloAineistotSchema, { abortEarly: false, recursive: true }),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues,
  };

  const useFormReturn = useForm<NahtavilleAsetettavatAineistotFormValues>(formOptions);
  const {
    formState: { isDirty },
  } = useFormReturn;

  useEffect(() => {
    setIsDirty(isDirty);
  }, [isDirty, setIsDirty]);

  useLeaveConfirm(isDirty);

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
