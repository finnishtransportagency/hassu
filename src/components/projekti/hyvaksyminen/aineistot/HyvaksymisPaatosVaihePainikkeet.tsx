import Button from "@components/button/Button";
import HassuSpinner from "@components/HassuSpinner";
import Section from "@components/layout/Section";
import { Stack } from "@mui/material";
import { api, TallennaProjektiInput } from "@services/api";
import log from "loglevel";
import React, { useState } from "react";
import { useFormContext } from "react-hook-form";
import { useProjekti } from "src/hooks/useProjekti";
import useSnackbars from "src/hooks/useSnackbars";
import deleteFieldArrayIds from "src/util/deleteFieldArrayIds";
import { HyvaksymisPaatosVaiheAineistotFormValues } from "./Muokkausnakyma";

const mapFormValuesToTallennaProjektiInput = ({
  oid,
  hyvaksymisPaatos,
  aineistoNahtavilla,
}: HyvaksymisPaatosVaiheAineistotFormValues): TallennaProjektiInput => {
  const aineistoNahtavillaFlat = Object.values(aineistoNahtavilla).flat();
  deleteFieldArrayIds(aineistoNahtavillaFlat);
  deleteFieldArrayIds(hyvaksymisPaatos);

  return { oid, hyvaksymisPaatosVaihe: { aineistoNahtavilla: aineistoNahtavillaFlat, hyvaksymisPaatos } };
};

export default function NahtavillaoloPainikkeet() {
  const { mutate: reloadProjekti } = useProjekti();
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const { showSuccessMessage, showErrorMessage } = useSnackbars();

  const { handleSubmit, reset } = useFormContext<HyvaksymisPaatosVaiheAineistotFormValues>();

  const saveSuunnitteluvaihe = async (formData: TallennaProjektiInput) => {
    await api.tallennaProjekti(formData);
    if (reloadProjekti) await reloadProjekti();
  };

  const saveDraft = async (formData: HyvaksymisPaatosVaiheAineistotFormValues) => {
    reset(formData);
    setIsFormSubmitting(true);
    try {
      await saveSuunnitteluvaihe(mapFormValuesToTallennaProjektiInput(formData));
      showSuccessMessage("Tallennus onnistui!");
    } catch (e) {
      log.error("OnSubmit Error", e);
      showErrorMessage("Tallennuksessa tapahtui virhe");
    }
    setIsFormSubmitting(false);
  };

  return (
    <>
      <Section noDivider>
        <Stack justifyContent={{ md: "flex-end" }} direction={{ xs: "column", md: "row" }}>
          <Button onClick={handleSubmit(saveDraft)}>Tallenna Luonnos</Button>
          <Button primary disabled onClick={undefined}>
            Lähetä Hyväksyttäväksi
          </Button>
        </Stack>
      </Section>
      <HassuSpinner open={isFormSubmitting} />
    </>
  );
}
