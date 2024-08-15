import Button from "@components/button/Button";
import Section from "@components/layout/Section";
import { Stack } from "@mui/material";
import { TallennaProjektiInput } from "@services/api";
import log from "loglevel";
import React, { useCallback, useRef } from "react";
import { useFormContext } from "react-hook-form";
import useApi from "src/hooks/useApi";
import { useProjekti } from "src/hooks/useProjekti";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import useSnackbars from "src/hooks/useSnackbars";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import { LausuntoPyynnotFormValues, mapLausuntoPyyntoFormValuesToLausuntoPyyntoInput } from "../types";

export default function LausuntoPyynnotPainikkeet({ projekti }: Readonly<{ projekti: ProjektiLisatiedolla }>) {
  const { mutate: reloadProjekti } = useProjekti();
  const { showSuccessMessage } = useSnackbars();

  const { withLoadingSpinner } = useLoadingSpinner();

  const { handleSubmit } = useFormContext<LausuntoPyynnotFormValues>();
  const api = useApi();

  const saveLausuntoPyynnot = useCallback(
    async (formData: LausuntoPyynnotFormValues, afterSaveCallback?: () => Promise<void>) => {
      const tallennaProjektiInput: TallennaProjektiInput = mapLausuntoPyyntoFormValuesToLausuntoPyyntoInput(formData);
      await api.tallennaProjekti(tallennaProjektiInput);
      await afterSaveCallback?.();
    },
    [api]
  );
  const sleep = () => new Promise((resolve) => setTimeout(resolve, 2000));
  const retryCount = useRef<number>(0);
  const save = (formData: LausuntoPyynnotFormValues) =>
    withLoadingSpinner(
      (async () => {
        try {
          const aineistotValmiit = async () => {
            try {
              const tila = await api.lataaProjektinTila(projekti.oid);
              if (!tila.aineistotValmiit && retryCount.current < 30) {
                retryCount.current = retryCount.current + 1;
                await sleep();
                await aineistotValmiit();
              }
            } catch (e) {
              log.error(e);
            }
          };
          await saveLausuntoPyynnot(formData, aineistotValmiit);
          await reloadProjekti();
          showSuccessMessage("Tallennus onnistui");
        } catch (e) {
          log.error("OnSubmit Error", e);
        } finally {
          retryCount.current = 0;
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
