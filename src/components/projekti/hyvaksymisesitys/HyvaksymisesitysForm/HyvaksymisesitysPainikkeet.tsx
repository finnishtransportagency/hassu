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
import { HyvaksymisesitysFormValues, mapHyvaksymisesitysFormValuesToHyvaksymisesitysInput } from "../types";

export default function HyvaksymisesitysPainikkeet({ projekti }: { projekti: ProjektiLisatiedolla }) {
  const { mutate: reloadProjekti } = useProjekti();
  const { showSuccessMessage } = useSnackbars();

  const { withLoadingSpinner } = useLoadingSpinner();

  const { handleSubmit } = useFormContext<HyvaksymisesitysFormValues>();
  const api = useApi();

  const saveHyvaksymisesitys = useCallback(
    async (formData: HyvaksymisesitysFormValues, afterSaveCallback?: () => Promise<void>) => {
      const tallennaProjektiInput: TallennaProjektiInput = mapHyvaksymisesitysFormValuesToHyvaksymisesitysInput(formData);
      await api.tallennaProjekti(tallennaProjektiInput);
      if (reloadProjekti) {
        await reloadProjekti();
      }
      await afterSaveCallback?.();
    },
    [api, reloadProjekti]
  );

  const save = (formData: HyvaksymisesitysFormValues) =>
    withLoadingSpinner(
      (async () => {
        try {
          await saveHyvaksymisesitys(formData);
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
