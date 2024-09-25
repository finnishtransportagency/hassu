import Button from "@components/button/Button";
import Section from "@components/layout/Section";
import { Stack } from "@mui/material";
import log from "loglevel";
import React, { useCallback } from "react";
import { useFormContext } from "react-hook-form";
import useApi from "src/hooks/useApi";
import { useProjekti } from "src/hooks/useProjekti";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import useSnackbars from "src/hooks/useSnackbars";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import { LausuntoPyynnotFormValues, mapLausuntoPyyntoFormValuesToLausuntoPyyntoInput } from "../types";
import { useCheckAineistoValmiit } from "src/hooks/useCheckAineistoValmiit";

export default function LausuntoPyynnotPainikkeet({ projekti }: Readonly<{ projekti: ProjektiLisatiedolla }>) {
  const { mutate: reloadProjekti } = useProjekti();
  const { showSuccessMessage } = useSnackbars();

  const { withLoadingSpinner } = useLoadingSpinner();

  const { handleSubmit } = useFormContext<LausuntoPyynnotFormValues>();
  const api = useApi();

  const saveLausuntoPyynnot = useCallback(
    async (formData: LausuntoPyynnotFormValues) => {
      const tallennaProjektiInput = mapLausuntoPyyntoFormValuesToLausuntoPyyntoInput(formData);
      await api.tallennaProjekti(tallennaProjektiInput);
    },
    [api]
  );

  const checkAineistoValmiit = useCheckAineistoValmiit(projekti.oid);

  const save = (formData: LausuntoPyynnotFormValues) =>
    withLoadingSpinner(
      (async () => {
        try {
          await saveLausuntoPyynnot(formData);
          await checkAineistoValmiit({ retries: 30 });
          await reloadProjekti();
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
