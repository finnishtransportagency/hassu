import { HyvaksymisEsityksenTiedot, TallennaHyvaksymisEsitysInput } from "@services/api";
import { useMemo } from "react";
import { FormProvider, UseFormProps, useForm } from "react-hook-form";
import getDefaultValuesForForm from "./getDefaultValuesForForm";
import Section from "@components/layout/Section2";
import { Stack } from "@mui/material";
import Button from "@components/button/Button";
import useApi from "src/hooks/useApi";
import useHyvaksymisEsitys from "src/hooks/useHyvaksymisEsitys";
import useSpinnerAndSuccessMessage from "src/hooks/useSpinnerAndSuccessMessage";
import LinkinVoimassaoloaika from "./LomakeComponents/LinkinVoimassaoloaika";
import ViestiVastaanottajalle from "./LomakeComponents/ViestiVastaanottajalle";
import Laskutustiedot from "./LomakeComponents/Laskutustiedot";
import LinkkiHyvEsAineistoon from "./LomakeComponents/LinkkiHyvEsAineistoon";
import HyvaksymisEsitysTiedosto from "./LomakeComponents/HyvaksymisEsitysTiedosto";
import SectionContent from "@components/layout/SectionContent";
import Muistutukset from "./LomakeComponents/Muistutukset";
import Vastaanottajat from "./LomakeComponents/Vastaanottajat";
import MuuAineistoKoneelta from "./LomakeComponents/MuuAineistoKoneelta";
import MuuAineistoVelhosta from "./LomakeComponents/MuuAineistoVelhosta";

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
          <Section>
            <h3 className="vayla-subtitle">Vuorovaikutus</h3>
            <SectionContent>
              <Muistutukset kunnat={[50, 43]} />
              <h4 className="vayla-small-title">Lausunnot</h4>
            </SectionContent>
          </Section>
          <Section>
            <h3 className="vayla-subtitle">Muu tekninen aineisto</h3>
            <p>Voit halutessasi liittää...</p>
            <MuuAineistoVelhosta />
            <MuuAineistoKoneelta />
          </Section>
        </div>
        <div>
          <Vastaanottajat />
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
