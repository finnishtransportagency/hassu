import Button from "@components/button/Button";
import HassuSpinner from "@components/HassuSpinner";
import Section from "@components/layout/Section";
import { Stack } from "@mui/material";
import { TallennaProjektiInput } from "@services/api";
import log from "loglevel";
import React, { useState } from "react";
import { useFormContext } from "react-hook-form";
import useApi from "src/hooks/useApi";
import { useProjekti } from "src/hooks/useProjekti";
import useSnackbars from "src/hooks/useSnackbars";
import deleteFieldArrayIds from "src/util/deleteFieldArrayIds";
import { paatosSpecificRoutesMap, PaatosTyyppi } from "src/util/getPaatosSpecificData";
import { HyvaksymisPaatosVaiheAineistotFormValues } from "./Muokkausnakyma";

const mapFormValuesToTallennaProjektiInput = (
  { oid, versio, hyvaksymisPaatos, aineistoNahtavilla }: HyvaksymisPaatosVaiheAineistotFormValues,
  paatosTyyppi: PaatosTyyppi
): TallennaProjektiInput => {
  const aineistoNahtavillaFlat = Object.values(aineistoNahtavilla).flat();
  deleteFieldArrayIds(aineistoNahtavillaFlat);
  deleteFieldArrayIds(hyvaksymisPaatos);
  const { paatosVaiheAvain } = paatosSpecificRoutesMap[paatosTyyppi];

  return { oid, versio, [paatosVaiheAvain]: { aineistoNahtavilla: aineistoNahtavillaFlat, hyvaksymisPaatos } };
};

export default function PaatosPainikkeet({ paatosTyyppi }: { paatosTyyppi: PaatosTyyppi }) {
  const { mutate: reloadProjekti } = useProjekti();
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const { showSuccessMessage, showErrorMessage } = useSnackbars();

  const { handleSubmit, reset } = useFormContext<HyvaksymisPaatosVaiheAineistotFormValues>();
  const api = useApi();

  const saveSuunnitteluvaihe = async (formData: TallennaProjektiInput) => {
    await api.tallennaProjekti(formData);
    if (reloadProjekti) await reloadProjekti();
  };

  const saveDraft = async (formData: HyvaksymisPaatosVaiheAineistotFormValues) => {
    setIsFormSubmitting(true);
    try {
      await saveSuunnitteluvaihe(mapFormValuesToTallennaProjektiInput(formData, paatosTyyppi));
      reloadProjekti();
      reset(formData);
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
          <Button id="save_hyvaksymispaatosvaihe_draft" onClick={handleSubmit(saveDraft)}>
            Tallenna Luonnos
          </Button>
          <Button id="save_and_send_for_acceptance" primary disabled onClick={undefined}>
            Lähetä Hyväksyttäväksi
          </Button>
        </Stack>
      </Section>
      <HassuSpinner open={isFormSubmitting} />
    </>
  );
}
