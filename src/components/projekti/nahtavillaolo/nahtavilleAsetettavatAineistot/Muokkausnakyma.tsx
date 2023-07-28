import { yupResolver } from "@hookform/resolvers/yup";
import { AineistoInput, TallennaProjektiInput } from "@services/api";
import React, { ReactElement, useEffect, useMemo } from "react";
import { FormProvider, useForm, UseFormProps } from "react-hook-form";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import { nahtavillaoloAineistotSchema } from "src/schemas/nahtavillaoloAineistot";
import NahtavillaoloPainikkeet from "./NahtavillaoloPainikkeet";
import LausuntopyyntoonLiitettavaLisaaineisto from "./LausuntopyyntoonLiitettavaLisaaineisto";
import SuunnitelmatJaAineistot from "../../common/SuunnitelmatJaAineistot";
import useLeaveConfirm from "src/hooks/useLeaveConfirm";
import { aineistoToSplittedAineistoInput } from "src/util/aineistoToSplitAineistoInput";
import { getDefaultValueForAineistoNahtavilla } from "src/util/getDefaultValueForAineistoNahtavilla";

interface AineistoNahtavilla {
  [kategoriaId: string]: AineistoInput[];
}

type FormData = {
  aineistoNahtavilla: AineistoNahtavilla;
  lisaAineisto: AineistoInput[];
  poistetutAineistoNahtavilla: AineistoInput[];
  poistetutLisaAineisto: AineistoInput[];
};

export type NahtavilleAsetettavatAineistotFormValues = Pick<TallennaProjektiInput, "oid" | "versio"> & FormData;

export default function Muokkausnakyma(): ReactElement {
  const { data: projekti } = useProjekti({ revalidateOnMount: true });
  return <>{projekti && <MuokkausnakymaLomake projekti={projekti} />}</>;
}

interface MuokkausnakymaLomakeProps {
  projekti: ProjektiLisatiedolla;
}

function MuokkausnakymaLomake({ projekti }: MuokkausnakymaLomakeProps) {
  const defaultValues: NahtavilleAsetettavatAineistotFormValues = useMemo(() => {
    const { lisatty: lisaAineisto, poistettu: poistetutLisaAineisto } = aineistoToSplittedAineistoInput(
      projekti.nahtavillaoloVaihe?.lisaAineisto
    );

    const { lisatty: aineistoNahtavilla, poistettu: poistetutAineistoNahtavilla } = aineistoToSplittedAineistoInput(
      projekti.nahtavillaoloVaihe?.aineistoNahtavilla
    );

    return {
      oid: projekti.oid,
      versio: projekti.versio,
      aineistoNahtavilla: getDefaultValueForAineistoNahtavilla(aineistoNahtavilla),
      poistetutAineistoNahtavilla,
      poistetutLisaAineisto,
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

  useLeaveConfirm(isDirty);

  const { reset } = useFormReturn;
  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  return (
    <FormProvider {...useFormReturn}>
      <form>
        <SuunnitelmatJaAineistot
          dialogInfoText="Valitse tiedostot,
          jotka haluat tuoda nähtäville."
          sectionTitle="Nähtäville asetettava aineisto"
          sectionInfoText="Nähtäville asetettava aineisto sekä lausuntopyyntöön liitettävä aineisto tuodaan Projektivelhosta. Nähtäville asetettu aineisto siirtyy automaation avulla alakategorioihin ja käyttäjän on mahdollista järjestellä aineistoja, siirtää aineistoja alakategoriasta toiseen tai poistaa tuotuja aineistoja.
          Nähtäville asetettu aineisto julkaistaan palvelun julkisella puolella kuulutuksen julkaisupäivänä."
          vaihe={projekti.nahtavillaoloVaihe}
        />
        <LausuntopyyntoonLiitettavaLisaaineisto />
        <NahtavillaoloPainikkeet />
      </form>
    </FormProvider>
  );
}
