import { HyvaksymisEsityksenTiedot, TallennaHyvaksymisEsitysInput } from "@services/api";
import { useMemo } from "react";
import { FormProvider, UseFormProps, useForm } from "react-hook-form";
import getDefaultValuesForForm from "./getDefaultValuesForForm";

export default function HyvaksymisEsitysLomake({ hyvaksymisEsityksenTiedot }: { hyvaksymisEsityksenTiedot: HyvaksymisEsityksenTiedot }) {
  const defaultValues: TallennaHyvaksymisEsitysInput = useMemo(
    () => getDefaultValuesForForm(hyvaksymisEsityksenTiedot),
    [hyvaksymisEsityksenTiedot]
  );

  const formOptions: UseFormProps<TallennaHyvaksymisEsitysInput> = {
    //resolver: yupResolver(hyvaksymisEsitysSchema, { abortEarly: false, recursive: true }),
    defaultValues,
    mode: "onChange",
    reValidateMode: "onChange",
    //context: { hyvaksymisEsityksenTiedot, validationMode },
  };

  const useFormReturn = useForm<TallennaHyvaksymisEsitysInput>(formOptions);
  return (
    <FormProvider {...useFormReturn}>
      <form></form>
    </FormProvider>
  );
}
