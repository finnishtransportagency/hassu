import { HyvaksymisEsityksenTiedot, TallennaHyvaksymisEsitysInput } from "@services/api";
import { useMemo } from "react";
import { FormProvider, UseFormProps, useForm } from "react-hook-form";
import getDefaultValuesForForm from "./getDefaultValuesForForm";
import MuuTekninenAineisto from "./MuuTekninenAineisto";
import Section from "@components/layout/Section2";
import { Stack } from "@mui/material";
import Button from "@components/button/Button";
import useApi from "src/hooks/useApi";
import useHyvaksymisEsitys from "src/hooks/useHyvaksymisEsitys";
import useSpinnerAndSuccessMessage from "src/hooks/useSpinnerAndSuccessMessage";
import LinkinVoimassaoloaika from "./LinkinVoimassaoloaika";
import ViestiVastaanottajalle from "./ViestiVastaanottajalle";
import Laskutustiedot from "./Laskutustiedot";
import LinkkiHyvEsAineistoon from "./LinkkiHyvEsAineistoon";
import HyvaksymisEsitysTiedosto from "./HyvaksymisEsitysTiedosto";

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
  const api = useApi();
  const { mutate: reloadData } = useHyvaksymisEsitys();

  const save = useSpinnerAndSuccessMessage(async (formData: TallennaHyvaksymisEsitysInput) => {
    await api.tallennaHyvaksymisEsitys(formData);
    await reloadData();
  }, "Tallennus onnistui");

  return (
    <FormProvider {...useFormReturn}>
      <form>
        <div>
          <h2 className="vayla-title">Hyväksymisesityksen sisältö</h2>
          <LinkinVoimassaoloaika />
          <ViestiVastaanottajalle />
          <Laskutustiedot />
        </div>
        <div>
          <h2 className="vayla-title">Hyväksymisesitykseen liitettävä aineisto</h2>
          <LinkkiHyvEsAineistoon hash={hyvaksymisEsityksenTiedot.hyvaksymisEsitys?.hash} oid={hyvaksymisEsityksenTiedot.oid} />
          <HyvaksymisEsitysTiedosto />
          <h3 className="vayla-subtitle">Suunnitelma</h3>
          <h3 className="vayla-subtitle">Vuorovaikutus</h3>
          <MuuTekninenAineisto />
        </div>
        <div>
          <h3 className="vayla-subtitle">Hyväksymisesityksen vastaanottajat</h3>
          <h3 className="vayla-subtitle">Hyväksymisesityksen sisällön esikatselu</h3>
        </div>
        <Section noDivider>
          <Stack justifyContent={{ md: "flex-end" }} direction={{ xs: "column", md: "row" }}>
            <Button primary id="save" onClick={useFormReturn.handleSubmit(save)}>
              Tallenna
            </Button>
          </Stack>
        </Section>
      </form>
    </FormProvider>
  );
}
