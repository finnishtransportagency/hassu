import Button from "@components/button/Button";
import Section from "@components/layout/Section";
import { Stack } from "@mui/material";
import { TallennaProjektiInput } from "@services/api";
import { kategorisoimattomatId } from "hassu-common/aineistoKategoriat";
import log from "loglevel";
import { useRouter } from "next/router";
import React, { useCallback, useMemo } from "react";
import { useFormContext } from "react-hook-form";
import useApi from "src/hooks/useApi";
import { useProjekti } from "src/hooks/useProjekti";
import useSnackbars from "src/hooks/useSnackbars";
import { handleAineistoArraysForSave as handleAineistoArraysForSave } from "src/util/handleAineistoArraysForSave";
import { paatosSpecificRoutesMap, PaatosTyyppi } from "src/util/getPaatosSpecificData";
import { HyvaksymisPaatosVaiheAineistotFormValues } from "./Muokkausnakyma";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";

const mapFormValuesToTallennaProjektiInput = (
  {
    oid,
    versio,
    hyvaksymisPaatos,
    poistetutAineistoNahtavilla,
    poistetutHyvaksymisPaatos,
    aineistoNahtavilla,
  }: HyvaksymisPaatosVaiheAineistotFormValues,
  paatosTyyppi: PaatosTyyppi
): TallennaProjektiInput => {
  const { paatosVaiheAvain } = paatosSpecificRoutesMap[paatosTyyppi];
  return {
    oid,
    versio,
    [paatosVaiheAvain]: {
      aineistoNahtavilla: handleAineistoArraysForSave(Object.values(aineistoNahtavilla).flat(), poistetutAineistoNahtavilla),
      hyvaksymisPaatos: handleAineistoArraysForSave(hyvaksymisPaatos, poistetutHyvaksymisPaatos),
    },
  };
};

export default function PaatosPainikkeet({ paatosTyyppi }: { paatosTyyppi: PaatosTyyppi }) {
  const router = useRouter();
  const { mutate: reloadProjekti, data: projekti } = useProjekti();
  const { showSuccessMessage } = useSnackbars();

  const { withLoadingSpinner } = useLoadingSpinner();

  const { handleSubmit, watch } = useFormContext<HyvaksymisPaatosVaiheAineistotFormValues>();
  const api = useApi();

  const aineistoNahtavilla = watch("aineistoNahtavilla");
  const hyvaksymisPaatos = watch("hyvaksymisPaatos");
  const kategorisoimattomat = watch(`aineistoNahtavilla.${kategorisoimattomatId}`);

  const aineistotPresentAndNoKategorisoimattomat = useMemo(() => {
    const aineistoNahtavillaFlat = Object.values(aineistoNahtavilla).flat();
    return !!aineistoNahtavillaFlat.length && !!hyvaksymisPaatos.length && !kategorisoimattomat.length;
  }, [aineistoNahtavilla, hyvaksymisPaatos.length, kategorisoimattomat.length]);

  const savePaatosAineisto = useCallback(
    (formData: HyvaksymisPaatosVaiheAineistotFormValues, afterSaveCallback?: () => Promise<void>) =>
      withLoadingSpinner(
        (async () => {
          try {
            const tallennaProjektiInput: TallennaProjektiInput = mapFormValuesToTallennaProjektiInput(formData, paatosTyyppi);
            await api.tallennaProjekti(tallennaProjektiInput);
            if (reloadProjekti) {
              await reloadProjekti();
            }
            showSuccessMessage("Tallennus onnistui");
            await afterSaveCallback?.();
          } catch (e) {
            log.error("OnSubmit Error", e);
          }
        })()
      ),
    [api, paatosTyyppi, reloadProjekti, showSuccessMessage, withLoadingSpinner]
  );

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
      await router.push({ query: { oid: projekti?.oid }, pathname: paatosPathnames[paatosTyyppi] });
    };
    await savePaatosAineisto(formData, moveToKuulutusPage);
  };

  if (!projekti) {
    return <></>;
  }

  return (
    <Section noDivider>
      <Stack justifyContent={{ md: "flex-end" }} direction={{ xs: "column", md: "row" }}>
        <Button id="save_hyvaksymispaatosvaihe_draft" onClick={handleSubmit(saveDraft)}>
          Tallenna Luonnos
        </Button>
        <Button
          id="save_and_send_for_acceptance"
          type="button"
          primary
          disabled={!aineistotPresentAndNoKategorisoimattomat}
          onClick={handleSubmit(saveAndMoveToKuulutusPage)}
        >
          Tallenna ja Siirry Kuulutukselle
        </Button>
      </Stack>
    </Section>
  );
}
