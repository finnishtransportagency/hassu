import Button from "@components/button/Button";
import Section from "@components/layout/Section";
import { Stack } from "@mui/material";
import { TallennaProjektiInput } from "@services/api";
import log from "loglevel";
import React from "react";
import { useFormContext } from "react-hook-form";
import useApi from "src/hooks/useApi";
import { useProjekti } from "src/hooks/useProjekti";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import { LausuntoPyynnonTaydennysFormValues, mapLausuntoPyynnonTaydennysFormValuesToLausuntoPyyntoInput } from "../types";
import { useCheckAineistoValmiit } from "src/hooks/useCheckAineistoValmiit";
import { useShowTallennaProjektiMessage } from "src/hooks/useShowTallennaProjektiMessage";

export default function LausuntoPyynnonTaydennysPainikkeet({ projekti }: Readonly<{ projekti: ProjektiLisatiedolla }>) {
  const { mutate: reloadProjekti } = useProjekti();
  const showTallennaProjektiMessage = useShowTallennaProjektiMessage();

  const { withLoadingSpinner } = useLoadingSpinner();

  const { handleSubmit } = useFormContext<LausuntoPyynnonTaydennysFormValues>();
  const api = useApi();

  const checkAineistoValmiit = useCheckAineistoValmiit(projekti.oid);
  const save = (formData: LausuntoPyynnonTaydennysFormValues) =>
    withLoadingSpinner(
      (async () => {
        try {
          const tallennaProjektiInput: TallennaProjektiInput = mapLausuntoPyynnonTaydennysFormValuesToLausuntoPyyntoInput(formData);
          const response = await api.tallennaProjekti(tallennaProjektiInput);
          await checkAineistoValmiit({ retries: 30 });
          await reloadProjekti();
          showTallennaProjektiMessage(response);
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
