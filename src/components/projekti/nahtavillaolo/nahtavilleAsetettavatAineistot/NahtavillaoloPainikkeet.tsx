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
import { NahtavilleAsetettavatAineistotFormValues } from "./Muokkausnakyma";

const mapFormValuesToTallennaProjektiInput = ({
  oid,
  nahtavillaoloVaihe,
}: NahtavilleAsetettavatAineistotFormValues): TallennaProjektiInput => {
  const aineistoNahtavillaFlat = Object.values(nahtavillaoloVaihe.aineistoNahtavilla).flat();
  deleteFieldArrayIds(aineistoNahtavillaFlat);
  deleteFieldArrayIds(nahtavillaoloVaihe.lisaAineisto);
  const result: TallennaProjektiInput = {
    oid,
    nahtavillaoloVaihe: { aineistoNahtavilla: aineistoNahtavillaFlat, lisaAineisto: nahtavillaoloVaihe.lisaAineisto },
  };
  return result;
};

export default function NahtavillaoloPainikkeet() {
  const { mutate: reloadProjekti } = useProjekti();
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const { showSuccessMessage, showErrorMessage } = useSnackbars();

  const { handleSubmit, reset } = useFormContext<NahtavilleAsetettavatAineistotFormValues>();

  const saveSuunnitteluvaihe = async (formData: NahtavilleAsetettavatAineistotFormValues) => {
    const tallennaProjektiInput: TallennaProjektiInput = mapFormValuesToTallennaProjektiInput(formData);
    await api.tallennaProjekti(tallennaProjektiInput);
    if (reloadProjekti) await reloadProjekti();
    reset(formData);
  };

  const saveDraft = async (formData: NahtavilleAsetettavatAineistotFormValues) => {
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
          <Button id="save_nahtavillaolovaihe_draft" onClick={handleSubmit(saveDraft)}>
            Tallenna Luonnos
          </Button>
          <Button primary disabled id="save_and_send_for_acceptance" onClick={undefined}>
            Lähetä Hyväksyttäväksi
          </Button>
        </Stack>
      </Section>
      <HassuSpinner open={isFormSubmitting} />
    </>
  );
}
