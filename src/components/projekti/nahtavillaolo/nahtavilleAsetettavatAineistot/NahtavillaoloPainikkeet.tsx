import Button from "@components/button/Button";
import HassuSpinner from "@components/HassuSpinner";
import Section from "@components/layout/Section";
import { Stack } from "@mui/material";
import { TallennaProjektiInput } from "@services/api";
import { kategorisoimattomatId } from "common/aineistoKategoriat";
import log from "loglevel";
import router from "next/router";
import React, { useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";
import useApi from "src/hooks/useApi";
import { useProjekti } from "src/hooks/useProjekti";
import useSnackbars from "src/hooks/useSnackbars";
import deleteFieldArrayIds from "src/util/deleteFieldArrayIds";
import { NahtavilleAsetettavatAineistotFormValues } from "./Muokkausnakyma";

const mapFormValuesToTallennaProjektiInput = ({
  oid,
  versio,
  lisaAineisto,
  aineistoNahtavilla,
}: NahtavilleAsetettavatAineistotFormValues): TallennaProjektiInput => {
  const aineistoNahtavillaFlat = Object.values(aineistoNahtavilla).flat();
  deleteFieldArrayIds(aineistoNahtavillaFlat);
  deleteFieldArrayIds(lisaAineisto);
  return {
    oid,
    versio,
    nahtavillaoloVaihe: { aineistoNahtavilla: aineistoNahtavillaFlat, lisaAineisto },
  };
};

export default function NahtavillaoloPainikkeet() {
  const { mutate: reloadProjekti, data: projekti } = useProjekti();
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const { showSuccessMessage } = useSnackbars();

  const { handleSubmit, watch } = useFormContext<NahtavilleAsetettavatAineistotFormValues>();
  const api = useApi();

  const aineistoNahtavilla = watch("aineistoNahtavilla");
  const kategorisoimattomat = watch(`aineistoNahtavilla.${kategorisoimattomatId}`);

  const aineistotPresentAndNoKategorisoimattomat = useMemo(() => {
    const aineistoNahtavillaFlat = Object.values(aineistoNahtavilla).flat();
    return !!aineistoNahtavillaFlat.length && !kategorisoimattomat.length;
  }, [aineistoNahtavilla, kategorisoimattomat.length]);

  if (!projekti) {
    return <></>;
  }

  const saveNahtavillaoloAineisto = async (formData: NahtavilleAsetettavatAineistotFormValues, afterSaveCallback?: () => Promise<void>) => {
    setIsFormSubmitting(true);
    try {
      const tallennaProjektiInput: TallennaProjektiInput = mapFormValuesToTallennaProjektiInput(formData);
      await api.tallennaProjekti(tallennaProjektiInput);
      if (reloadProjekti) {
        await reloadProjekti();
      }
      showSuccessMessage("Tallennus onnistui");
      await afterSaveCallback?.();
    } catch (e) {
      log.error("OnSubmit Error", e);
    } finally {
      setIsFormSubmitting(false);
    }
  };

  const saveDraft = async (formData: NahtavilleAsetettavatAineistotFormValues) => {
    await saveNahtavillaoloAineisto(formData);
  };

  const saveAndMoveToKuulutusPage = async (formData: NahtavilleAsetettavatAineistotFormValues) => {
    const moveToKuulutusPage = async () => {
      await router.push({ query: { oid: projekti.oid }, pathname: "/yllapito/projekti/[oid]/nahtavillaolo/kuulutus" });
    };
    await saveNahtavillaoloAineisto(formData, moveToKuulutusPage);
  };

  return (
    <>
      <Section noDivider>
        <Stack justifyContent={{ md: "flex-end" }} direction={{ xs: "column", md: "row" }}>
          <Button id="save_nahtavillaolovaihe_draft" onClick={handleSubmit(saveDraft)}>
            Tallenna Luonnos
          </Button>
          <Button
            primary
            disabled={!aineistotPresentAndNoKategorisoimattomat}
            id="save_and_move_to_kuulutus_page"
            onClick={handleSubmit(saveAndMoveToKuulutusPage)}
          >
            Tallenna ja Siirry Kuulutukselle
          </Button>
        </Stack>
      </Section>
      <HassuSpinner open={isFormSubmitting} />
    </>
  );
}
