import Button from "@components/button/Button";
import HassuSpinner from "@components/HassuSpinner";
import Section from "@components/layout/Section";
import { Stack } from "@mui/material";
import { TallennaProjektiInput } from "@services/api";
import { kategorisoimattomatId } from "common/aineistoKategoriat";
import log from "loglevel";
import { useRouter } from "next/router";
import React, { useMemo, useState } from "react";
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
  const router = useRouter();
  const { mutate: reloadProjekti, data: projekti } = useProjekti();
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const { showSuccessMessage } = useSnackbars();

  const { handleSubmit, watch } = useFormContext<HyvaksymisPaatosVaiheAineistotFormValues>();
  const api = useApi();

  const aineistoNahtavilla = watch("aineistoNahtavilla");
  const hyvaksymisPaatos = watch("hyvaksymisPaatos");
  const kategorisoimattomat = watch(`aineistoNahtavilla.${kategorisoimattomatId}`);

  const aineistotPresentAndNoKategorisoimattomat = useMemo(() => {
    const aineistoNahtavillaFlat = Object.values(aineistoNahtavilla).flat();
    return !!aineistoNahtavillaFlat.length && !!hyvaksymisPaatos.length && !kategorisoimattomat.length;
  }, [aineistoNahtavilla, hyvaksymisPaatos.length, kategorisoimattomat.length]);

  if (!projekti) {
    return <></>;
  }

  const savePaatosAineisto = async (formData: HyvaksymisPaatosVaiheAineistotFormValues, afterSaveCallback?: () => Promise<void>) => {
    setIsFormSubmitting(true);
    try {
      const tallennaProjektiInput: TallennaProjektiInput = mapFormValuesToTallennaProjektiInput(formData, paatosTyyppi);
      await api.tallennaProjekti(tallennaProjektiInput);
      if (reloadProjekti) {
        await reloadProjekti();
      }
      showSuccessMessage("Tallennus onnistui!");
      await afterSaveCallback?.();
    } catch (e) {
      log.error("OnSubmit Error", e);
    } finally {
      setIsFormSubmitting(false);
    }
  };

  const saveDraft = async (formData: HyvaksymisPaatosVaiheAineistotFormValues) => {
    await savePaatosAineisto(formData);
  };

  const saveAndMoveToKuulutusPage = async (formData: HyvaksymisPaatosVaiheAineistotFormValues) => {
    const moveToKuulutusPage = async () => {
      const paatosPathnames: Record<PaatosTyyppi, string> = {
        HYVAKSYMISPAATOS: "/yllapito/projekti/[oid]/hyvaksymispaatos/kuulutus",
        JATKOPAATOS1: "/yllapito/projekti/[oid]/jatkaminen1/kuulutus",
        JATKOPAATOS2: "/yllapito/projekti/[oid]/jatkaminen2/kuulutus",
      };
      await router.push({ query: { oid: projekti.oid }, pathname: paatosPathnames[paatosTyyppi] });
    };
    await savePaatosAineisto(formData, moveToKuulutusPage);
  };

  return (
    <>
      <Section noDivider>
        <Stack justifyContent={{ md: "flex-end" }} direction={{ xs: "column", md: "row" }}>
          <Button id="save_hyvaksymispaatosvaihe_draft" onClick={handleSubmit(saveDraft)}>
            Tallenna Luonnos
          </Button>
          <Button
            id="save_and_send_for_acceptance"
            primary
            disabled={!aineistotPresentAndNoKategorisoimattomat}
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
