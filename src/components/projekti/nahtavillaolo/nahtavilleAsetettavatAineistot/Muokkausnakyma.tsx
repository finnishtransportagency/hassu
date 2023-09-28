import { yupResolver } from "@hookform/resolvers/yup";
import { AineistoInput, TallennaProjektiInput, TilasiirtymaTyyppi } from "@services/api";
import React, { ReactElement, useEffect, useMemo } from "react";
import { FormProvider, useForm, UseFormProps } from "react-hook-form";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import { nahtavillaoloAineistotSchema } from "src/schemas/nahtavillaoloAineistot";
import LausuntopyyntoonLiitettavaLisaaineisto from "./LausuntopyyntoonLiitettavaLisaaineisto";
import SuunnitelmatJaAineistot from "../../common/SuunnitelmatJaAineistot";
import useLeaveConfirm from "src/hooks/useLeaveConfirm";
import { handleAineistoArrayForDefaultValues } from "src/util/handleAineistoArrayForDefaultValues";
import { getDefaultValueForAineistoNahtavilla } from "src/util/getDefaultValueForAineistoNahtavilla";
import useValidationMode from "src/hooks/useValidationMode";
import AineistoSivunPainikkeet from "@components/projekti/AineistoSivunPainikkeet";

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
    const { lisatty: lisaAineisto, poistettu: poistetutLisaAineisto } = handleAineistoArrayForDefaultValues(
      projekti.nahtavillaoloVaihe?.lisaAineisto,
      true
    );

    const { lisatty: aineistoNahtavilla, poistettu: poistetutAineistoNahtavilla } = handleAineistoArrayForDefaultValues(
      projekti.nahtavillaoloVaihe?.aineistoNahtavilla,
      false
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

  const validationMode = useValidationMode();

  const formOptions: UseFormProps<NahtavilleAsetettavatAineistotFormValues> = {
    resolver: yupResolver(nahtavillaoloAineistotSchema, { abortEarly: false, recursive: true }),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues,
    context: { projekti, validationMode },
  };

  const useFormReturn = useForm<NahtavilleAsetettavatAineistotFormValues>(formOptions);
  const {
    formState: { isDirty },
    reset,
  } = useFormReturn;

  useLeaveConfirm(isDirty);

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
        <AineistoSivunPainikkeet
          siirtymaTyyppi={TilasiirtymaTyyppi.NAHTAVILLAOLO}
          muokkausTila={projekti.nahtavillaoloVaihe?.muokkausTila}
          projekti={projekti}
          julkaisu={projekti.nahtavillaoloVaiheJulkaisu}
        />
      </form>
    </FormProvider>
  );
}
