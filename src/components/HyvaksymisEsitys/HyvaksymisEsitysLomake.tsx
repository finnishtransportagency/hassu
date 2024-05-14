import { HyvaksymisEsityksenTiedot, TallennaHyvaksymisEsitysInput } from "@services/api";
import { useMemo } from "react";
import { FormProvider, UseFormProps, useForm } from "react-hook-form";
import getDefaultValuesForForm from "./getDefaultValuesForForm";
import MuuTekninenAineisto from "./MuuTekninenAineisto";

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
      <form>
        <div>
          <h2 className="vayla-title">Hyväksymisesityksen sisältö</h2>
          <h3 className="vayla-subtitle">Linkin voimassaoloaika</h3>
          <h3 className="vayla-subtitle">Viesti vastaanottajille</h3>
          <h3 className="vayla-subtitle">Laskutustiedot hyväksymismaksua varten</h3>
        </div>
        <div>
          <h2 className="vayla-title">Hyväksymisesitykseen liitettävä aineisto</h2>
          <h3 className="vayla-subtitle">Linkki hyväksymisesityksen aineistoon</h3>
          <h3 className="vayla-subtitle">Hyväksymisesitys</h3>
          <h3 className="vayla-subtitle">Suunnitelma</h3>
          <h3 className="vayla-subtitle">Vuorovaikutus</h3>
          <MuuTekninenAineisto />
        </div>
        <div>
          <h3 className="vayla-subtitle">Hyväksymisesityksen vastaanottajat</h3>
          <h3 className="vayla-subtitle">Hyväksymisesityksen sisällön esikatselu</h3>
        </div>
      </form>
    </FormProvider>
  );
}
