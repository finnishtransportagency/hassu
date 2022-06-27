import Button from "@components/button/Button";
import HassuSpinner from "@components/HassuSpinner";
import Section from "@components/layout/Section";
import { Stack } from "@mui/material";
import { api, TallennaProjektiInput } from "@services/api";
import log from "loglevel";
import React, { useState } from "react";
import { useFormContext } from "react-hook-form";
import { useProjektiRoute } from "src/hooks/useProjektiRoute";
import useSnackbars from "src/hooks/useSnackbars";
import deleteFieldArrayIds from "src/util/deleteFieldArrayIds";
import { NahtavilleAsetettavatAineistotFormValues } from "./NahtavilleAsetettavatAineistot";

const mapFormValuesToTallennaProjektiInput = (
  formData: NahtavilleAsetettavatAineistotFormValues
): TallennaProjektiInput => {
  const aineistoNahtavilla = Object.values(formData.aineistoNahtavilla).flat();
  deleteFieldArrayIds(aineistoNahtavilla);
  return { oid: formData.oid, nahtavillaoloVaihe: { aineistoNahtavilla } };
};

export default function NahtavillaoloPainikkeet() {
  const { mutate: reloadProjekti } = useProjektiRoute();
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const { showSuccessMessage, showErrorMessage } = useSnackbars();

  const { handleSubmit } = useFormContext<NahtavilleAsetettavatAineistotFormValues>();

  const saveSuunnitteluvaihe = async (formData: TallennaProjektiInput) => {
    await api.tallennaProjekti(formData);
    if (reloadProjekti) await reloadProjekti();
  };

  const saveDraft = async (formData: NahtavilleAsetettavatAineistotFormValues) => {
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
