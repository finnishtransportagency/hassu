import Button from "@components/button/Button";
import HassuDialog from "@components/HassuDialog";
import Section from "@components/layout/Section";
import { kategorisoimattomatId } from "hassu-common/aineistoKategoriat";
import { DialogActions, DialogContent, Stack } from "@mui/material";
import { MuokkausTila, TallennaProjektiInput, TilasiirtymaToiminto, TilasiirtymaTyyppi } from "@services/api";
import log from "loglevel";
import router from "next/router";
import React, { useCallback, useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";
import useApi from "src/hooks/useApi";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import { useProjekti } from "src/hooks/useProjekti";
import useSnackbars from "src/hooks/useSnackbars";
import { handleAineistoArraysForSave } from "src/util/handleAineistoArraysForSave";
import { NahtavilleAsetettavatAineistotFormValues } from "./Muokkausnakyma";

const mapFormValuesToTallennaProjektiInput = ({
  oid,
  versio,
  lisaAineisto,
  aineistoNahtavilla,
  poistetutAineistoNahtavilla,
  poistetutLisaAineisto,
}: NahtavilleAsetettavatAineistotFormValues): TallennaProjektiInput => ({
  oid,
  versio,
  nahtavillaoloVaihe: {
    aineistoNahtavilla: handleAineistoArraysForSave(Object.values(aineistoNahtavilla).flat(), poistetutAineistoNahtavilla),
    lisaAineisto: handleAineistoArraysForSave(lisaAineisto, poistetutLisaAineisto),
  },
});

export default function NahtavillaoloPainikkeet() {
  const { mutate: reloadProjekti, data: projekti } = useProjekti();
  const { showSuccessMessage } = useSnackbars();
  const { withLoadingSpinner } = useLoadingSpinner();

  const { handleSubmit, watch } = useFormContext<NahtavilleAsetettavatAineistotFormValues>();
  const api = useApi();

  const aineistoNahtavilla = watch("aineistoNahtavilla");
  const kategorisoimattomat = watch(`aineistoNahtavilla.${kategorisoimattomatId}`);

  const aineistotPresentAndNoKategorisoimattomat = useMemo(() => {
    const aineistoNahtavillaFlat = Object.values(aineistoNahtavilla).flat();
    return !!aineistoNahtavillaFlat.length && !kategorisoimattomat.length;
  }, [aineistoNahtavilla, kategorisoimattomat.length]);

  const saveNahtavillaoloAineisto = useCallback(
    (formData: NahtavilleAsetettavatAineistotFormValues, afterSaveCallback?: () => Promise<void>) =>
      withLoadingSpinner(
        (async () => {
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
          }
        })()
      ),
    [withLoadingSpinner, api, reloadProjekti, showSuccessMessage]
  );

  const saveDraft = async (formData: NahtavilleAsetettavatAineistotFormValues) => {
    await saveNahtavillaoloAineisto(formData);
  };

  const saveAndMoveToKuulutusPage = useCallback(
    async (formData: NahtavilleAsetettavatAineistotFormValues) => {
      const moveToKuulutusPage = async () => {
        await router.push({ query: { oid: projekti?.oid }, pathname: "/yllapito/projekti/[oid]/nahtavillaolo/kuulutus" });
      };
      await saveNahtavillaoloAineisto(formData, moveToKuulutusPage);
    },
    [projekti?.oid, saveNahtavillaoloAineisto]
  );

  const sendForApprovalAineistoMuokkaus = useCallback(
    async (formData: NahtavilleAsetettavatAineistotFormValues) => {
      const sendForApproval = async () => {
        await api.siirraTila({
          oid: formData.oid,
          toiminto: TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI,
          tyyppi: TilasiirtymaTyyppi.NAHTAVILLAOLO,
        });
      };
      await saveNahtavillaoloAineisto(formData, sendForApproval);
    },
    [api, saveNahtavillaoloAineisto]
  );

  const [isOpen, setIsOpen] = useState(false);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const cancelAineistoMuokkaus = useCallback(() => {
    withLoadingSpinner(
      (async () => {
        if (!projekti?.oid) {
          return;
        }
        try {
          await api.siirraTila({
            oid: projekti?.oid,
            toiminto: TilasiirtymaToiminto.PERU_AINEISTOMUOKKAUS,
            tyyppi: TilasiirtymaTyyppi.NAHTAVILLAOLO,
          });
          showSuccessMessage("Aineistojen muokkaustila suljettu");
          close();
        } catch {}
      })()
    );
  }, [withLoadingSpinner, api, close, projekti?.oid, showSuccessMessage]);

  if (!projekti) {
    return <></>;
  }

  return (
    <>
      <Section noDivider>
        {projekti.nahtavillaoloVaihe?.muokkausTila === MuokkausTila.AINEISTO_MUOKKAUS ? (
          <Stack justifyContent={{ md: "space-between" }} direction={{ xs: "column", md: "row" }}>
            <Button id="cancel_aineistomuokkaus" type="button" onClick={open}>
              Poistu muokkaustilasta
            </Button>
            <Button
              primary
              disabled={!aineistotPresentAndNoKategorisoimattomat}
              id="aineistomuokkaus_send_for_approval"
              onClick={handleSubmit(sendForApprovalAineistoMuokkaus)}
            >
              Lähetä hyväksyttäväksi
            </Button>
            <HassuDialog title="Poistu aineistojen muokkastilasta" maxWidth="sm" open={isOpen} onClose={close}>
              <DialogContent>
                <p>
                  Haluatko poistua aineistojen muokkaustilasta? Painamalla Kyllä-painiketta poistut aineistojen aineistojen muokkaustilasta.
                  Tehtyjä muutoksia ei tallenneta.
                </p>
              </DialogContent>
              <DialogActions>
                <Button type="button" onClick={cancelAineistoMuokkaus} primary>
                  Kyllä
                </Button>
                <Button type="button" onClick={close}>
                  Peruuta
                </Button>
              </DialogActions>
            </HassuDialog>
          </Stack>
        ) : (
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
        )}
      </Section>
    </>
  );
}
