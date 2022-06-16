import Button from "@components/button/Button";
import HassuSpinner from "@components/HassuSpinner";
import Section from "@components/layout/Section";
import { Stack } from "@mui/material";
import { api } from "@services/api";
import log from "loglevel";
import React, { useState } from "react";
import { useFormContext } from "react-hook-form";
import { useProjektiRoute } from "src/hooks/useProjektiRoute";
import useSnackbars from "src/hooks/useSnackbars";

export default function NahtavillaoloPainikkeet() {
  const { mutate: reloadProjekti } = useProjektiRoute();
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const { showSuccessMessage, showErrorMessage } = useSnackbars();

  const { handleSubmit } = useFormContext<any>();

  const saveSuunnitteluvaihe = async (formData: any) => {
    await api.tallennaProjekti(formData);
    if (reloadProjekti) await reloadProjekti();
  };

  const saveDraft = async (formData: any) => {
    setIsFormSubmitting(true);
    try {
      await saveSuunnitteluvaihe(formData);
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
