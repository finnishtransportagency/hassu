import Button from "@components/button/Button";
import Section from "@components/layout/Section";
import { Stack } from "@mui/material";
import { TallennaProjektiInput } from "@services/api";
import log from "loglevel";
import React, { useCallback } from "react";
import { useFormContext } from "react-hook-form";
import useApi from "src/hooks/useApi";
import { useProjekti } from "src/hooks/useProjekti";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import useSnackbars from "src/hooks/useSnackbars";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import { LausuntoPyynnotFormValues, mapLausuntoPyyntoFormValuesToLausuntoPyyntoInput } from "../types";

export default function LausuntoPyynnotPainikkeet({ projekti }: { projekti: ProjektiLisatiedolla }) {
  const { mutate: reloadProjekti } = useProjekti();
  const { showSuccessMessage } = useSnackbars();

  const { withLoadingSpinner } = useLoadingSpinner();

  const { handleSubmit } = useFormContext<LausuntoPyynnotFormValues>();
  const api = useApi();

  const saveLausuntoPyynnot = useCallback(
    async (formData: LausuntoPyynnotFormValues, afterSaveCallback?: () => Promise<void>) => {
      const tallennaProjektiInput: TallennaProjektiInput = mapLausuntoPyyntoFormValuesToLausuntoPyyntoInput(formData);
      await api.tallennaProjekti(tallennaProjektiInput);
      if (reloadProjekti) {
        await reloadProjekti();
      }
      await afterSaveCallback?.();
    },
    [api, reloadProjekti]
  );

  const save = (formData: LausuntoPyynnotFormValues) =>
    withLoadingSpinner(
      (async () => {
        try {
          await saveLausuntoPyynnot(formData);
          showSuccessMessage("Tallennus onnistui");
        } catch (e) {
          log.error("OnSubmit Error", e);
        }
      })()
    );

  if (!projekti) {
    return <></>;
  }

  return (
    <Section noDivider>
      <Stack justifyContent={{ md: "flex-end" }} direction={{ xs: "column", md: "row" }}>
        <Button primary id="save" onClick={handleSubmit(save)}>
          Tallenna
        </Button>
      </Stack>
    </Section>
  );
}
