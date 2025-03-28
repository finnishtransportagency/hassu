import { yupResolver } from "@hookform/resolvers/yup";
import { TallennaProjektiInput, TilasiirtymaTyyppi } from "@services/api";
import React, { ReactElement, useEffect, useMemo } from "react";
import { FormProvider, useForm, UseFormProps } from "react-hook-form";
import { useProjekti } from "src/hooks/useProjekti";
import { ProjektiLisatiedolla, ProjektiValidationContext } from "hassu-common/ProjektiValidationContext";
import { nahtavillaoloAineistotSchema } from "src/schemas/nahtavillaoloAineistot";
import SuunnitelmatJaAineistot from "./NahtavillaolonAineistoLomake";
import useLeaveConfirm from "src/hooks/useLeaveConfirm";
import { handleAineistoArrayForDefaultValues } from "src/util/FormAineisto/handleAineistoArrayForDefaultValues";
import { getDefaultValueForAineistoNahtavilla } from "src/util/getDefaultValueForAineistoNahtavilla";
import useValidationMode from "src/hooks/useValidationMode";
import AineistoSivunPainikkeet from "@components/projekti/AineistoSivunPainikkeet";
import { getAineistoKategoriat } from "common/aineistoKategoriat";
import { FormAineisto } from "src/util/FormAineisto";

interface AineistoNahtavilla {
  [kategoriaId: string]: FormAineisto[];
}

type FormData = {
  aineistoNahtavilla: AineistoNahtavilla;
  poistetutAineistoNahtavilla: FormAineisto[];
};

export type NahtavilleAsetettavatAineistotFormValues = Pick<TallennaProjektiInput, "oid" | "versio"> & FormData;

export default function Muokkausnakyma(): ReactElement {
  const { data: projekti } = useProjekti();
  return <>{projekti && <MuokkausnakymaLomake projekti={projekti} />}</>;
}

interface MuokkausnakymaLomakeProps {
  projekti: ProjektiLisatiedolla;
}

function MuokkausnakymaLomake({ projekti }: Readonly<MuokkausnakymaLomakeProps>) {
  const { aineistoKategoriat, kategoriaIds } = useMemo(() => {
    const aineistoKategoriat = getAineistoKategoriat({
      projektiTyyppi: projekti.velho.tyyppi,
      showKategorisoimattomat: true,
      hideDeprecated: true,
    });
    return { aineistoKategoriat, kategoriaIds: aineistoKategoriat.listKategoriaIds() };
  }, [projekti.velho.tyyppi]);

  const defaultValues = useMemo<NahtavilleAsetettavatAineistotFormValues>(() => {
    const { lisatty: aineistoNahtavilla, poistettu: poistetutAineistoNahtavilla } = handleAineistoArrayForDefaultValues(
      projekti.nahtavillaoloVaihe?.aineistoNahtavilla,
      false
    );

    return {
      oid: projekti.oid,
      versio: projekti.versio,
      aineistoNahtavilla: getDefaultValueForAineistoNahtavilla(aineistoNahtavilla, kategoriaIds),
      poistetutAineistoNahtavilla,
    };
  }, [kategoriaIds, projekti]);

  const validationMode = useValidationMode();

  const formOptions: UseFormProps<NahtavilleAsetettavatAineistotFormValues, ProjektiValidationContext> = {
    resolver: yupResolver(nahtavillaoloAineistotSchema, { abortEarly: false, recursive: true }),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues,
    context: { projekti, validationMode },
  };

  const useFormReturn = useForm<NahtavilleAsetettavatAineistotFormValues, ProjektiValidationContext>(formOptions);
  const {
    formState: { isDirty, isSubmitting },
    reset,
  } = useFormReturn;

  useLeaveConfirm(!isSubmitting && isDirty);

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  return (
    <FormProvider {...useFormReturn}>
      <form>
        <SuunnitelmatJaAineistot vaihe={projekti.nahtavillaoloVaihe} aineistoKategoriat={aineistoKategoriat} />
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
