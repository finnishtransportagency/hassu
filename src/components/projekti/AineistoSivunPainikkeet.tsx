import Button from "@components/button/Button";
import Section from "@components/layout/Section";
import { DialogActions, DialogContent, Stack } from "@mui/material";
import { MuokkausTila, NahtavillaoloVaiheJulkaisu, TallennaProjektiInput, TilasiirtymaToiminto, TilasiirtymaTyyppi } from "@services/api";
import { kategorisoimattomatId } from "hassu-common/aineistoKategoriat";
import log from "loglevel";
import { useRouter } from "next/router";
import React, { useCallback, useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";
import useApi from "src/hooks/useApi";
import { useProjekti } from "src/hooks/useProjekti";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import useSnackbars from "src/hooks/useSnackbars";
import { handleAineistoArraysForSave as handleAineistoArraysForSave } from "src/util/FormAineisto/handleAineistoArraysForSave";
import { HyvaksymisPaatosVaiheAineistotFormValues } from "./paatos/aineistot/MuokkausNakyma";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import { NahtavilleAsetettavatAineistotFormValues } from "@components/projekti/nahtavillaolo/nahtavilleAsetettavatAineistot/Muokkausnakyma";
import HassuDialog from "@components/HassuDialog";
import useIsProjektiReadyForTilaChange from "src/hooks/useProjektinTila";
import { isInPast } from "common/util/dateUtils";
import { useWaitAineistoValmiit } from "src/hooks/useWaitAineistoValmiit";

type SiirtymaTyyppi =
  | TilasiirtymaTyyppi.NAHTAVILLAOLO
  | TilasiirtymaTyyppi.HYVAKSYMISPAATOSVAIHE
  | TilasiirtymaTyyppi.JATKOPAATOS_1
  | TilasiirtymaTyyppi.JATKOPAATOS_2;

const vaiheSpecificRoute: Record<
  SiirtymaTyyppi,
  keyof Pick<TallennaProjektiInput, "nahtavillaoloVaihe" | "hyvaksymisPaatosVaihe" | "jatkoPaatos1Vaihe" | "jatkoPaatos2Vaihe">
> = {
  NAHTAVILLAOLO: "nahtavillaoloVaihe",
  HYVAKSYMISPAATOSVAIHE: "hyvaksymisPaatosVaihe",
  JATKOPAATOS_1: "jatkoPaatos1Vaihe",
  JATKOPAATOS_2: "jatkoPaatos2Vaihe",
};

type FormValues = HyvaksymisPaatosVaiheAineistotFormValues & NahtavilleAsetettavatAineistotFormValues;

const mapFormValuesToTallennaProjektiInput = (
  { oid, versio, hyvaksymisPaatos, poistetutAineistoNahtavilla, poistetutHyvaksymisPaatos, aineistoNahtavilla }: FormValues,
  siirtymaTyyppi: SiirtymaTyyppi,
  muokkausTila: MuokkausTila | null | undefined
): TallennaProjektiInput => {
  const vaiheAvain = vaiheSpecificRoute[siirtymaTyyppi];

  const input: TallennaProjektiInput = {
    oid,
    versio,
  };

  if (vaiheAvain === "nahtavillaoloVaihe") {
    input[vaiheAvain] = {
      aineistoNahtavilla: handleAineistoArraysForSave(Object.values(aineistoNahtavilla).flat(), poistetutAineistoNahtavilla),
    };
  } else if (muokkausTila !== MuokkausTila.AINEISTO_MUOKKAUS) {
    input[vaiheAvain] = {
      aineistoNahtavilla: handleAineistoArraysForSave(Object.values(aineistoNahtavilla).flat(), poistetutAineistoNahtavilla),
      hyvaksymisPaatos: handleAineistoArraysForSave(hyvaksymisPaatos, poistetutHyvaksymisPaatos),
    };
  } else {
    input[vaiheAvain] = {
      aineistoNahtavilla: handleAineistoArraysForSave(Object.values(aineistoNahtavilla).flat(), poistetutAineistoNahtavilla),
    };
  }

  return input;
};

export default function AineistoSivunPainikkeet({
  siirtymaTyyppi,
  muokkausTila,
  projekti,
  julkaisu,
}: {
  siirtymaTyyppi: SiirtymaTyyppi;
  muokkausTila: MuokkausTila | null | undefined;
  projekti: ProjektiLisatiedolla;
  julkaisu: Pick<NahtavillaoloVaiheJulkaisu, "kuulutusPaiva"> | null | undefined;
}) {
  const router = useRouter();
  const { mutate: reloadProjekti } = useProjekti();
  const { showSuccessMessage } = useSnackbars();

  const { withLoadingSpinner } = useLoadingSpinner();

  const {
    handleSubmit,
    watch,
    formState: { isDirty },
  } = useFormContext<FormValues>();
  const api = useApi();

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
            tyyppi: siirtymaTyyppi,
          });
          showSuccessMessage("Aineistojen muokkaustila suljettu");
          await reloadProjekti();
          close();
        } catch {}
      })()
    );
  }, [withLoadingSpinner, projekti.oid, api, siirtymaTyyppi, showSuccessMessage, reloadProjekti, close]);

  const aineistoNahtavilla = watch("aineistoNahtavilla");
  const hyvaksymisPaatos = watch("hyvaksymisPaatos");
  const kategorisoimattomat = watch(`aineistoNahtavilla.${kategorisoimattomatId}`);

  const aineistotPresentAndNoKategorisoimattomat = useMemo(() => {
    const aineistoNahtavillaFlat = Object.values(aineistoNahtavilla || {}).flat();
    const paatosAineistotPresentIfNeeded =
      siirtymaTyyppi === TilasiirtymaTyyppi.NAHTAVILLAOLO || muokkausTila === MuokkausTila.AINEISTO_MUOKKAUS || !!hyvaksymisPaatos?.length;
    return !!aineistoNahtavillaFlat?.length && paatosAineistotPresentIfNeeded && !kategorisoimattomat?.length;
  }, [aineistoNahtavilla, hyvaksymisPaatos?.length, kategorisoimattomat?.length, muokkausTila, siirtymaTyyppi]);

  const aineistotReady = useIsProjektiReadyForTilaChange();

  const waitAineistoValmiit = useWaitAineistoValmiit(projekti.oid);

  const kuulutusPaivaIsInPast = useMemo(() => !!julkaisu?.kuulutusPaiva && isInPast(julkaisu.kuulutusPaiva), [julkaisu?.kuulutusPaiva]);

  const aineistotReadyForHyvaksynta = aineistotPresentAndNoKategorisoimattomat && aineistotReady && !isDirty && !kuulutusPaivaIsInPast;

  const savePaatosAineisto = useCallback(
    async (formData: FormValues) => {
      const tallennaProjektiInput: TallennaProjektiInput = mapFormValuesToTallennaProjektiInput(formData, siirtymaTyyppi, muokkausTila);
      await api.tallennaProjekti(tallennaProjektiInput);
      await waitAineistoValmiit(5);
      await reloadProjekti?.();
    },
    [api, muokkausTila, reloadProjekti, siirtymaTyyppi, waitAineistoValmiit]
  );

  const sendForApprovalAineistoMuokkaus = useCallback(
    (formData: FormValues) =>
      withLoadingSpinner(
        (async () => {
          const sendForApproval = async () => {
            try {
              await api.siirraTila({
                oid: formData.oid,
                toiminto: TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI,
                tyyppi: siirtymaTyyppi,
              });
              await reloadProjekti();
              showSuccessMessage("Aineistot lähetetty hyväksyttäväksi");
            } catch (e) {
              log.error(e);
            }
          };
          await savePaatosAineisto(formData);
          await sendForApproval();
        })()
      ),
    [api, reloadProjekti, savePaatosAineisto, showSuccessMessage, siirtymaTyyppi, withLoadingSpinner]
  );

  const saveDraft = useCallback(
    (formData: FormValues) =>
      withLoadingSpinner(
        (async () => {
          try {
            await savePaatosAineisto(formData);
            showSuccessMessage("Tallennus onnistui");
          } catch (e) {
            log.error("OnSubmit Error", e);
          }
        })()
      ),
    [savePaatosAineisto, showSuccessMessage, withLoadingSpinner]
  );

  const saveAndMoveToKuulutusPage = async (formData: FormValues) =>
    await withLoadingSpinner(
      (async () => {
        const moveToKuulutusPage = async () => {
          const paatosPathnames: Record<SiirtymaTyyppi, string> = {
            HYVAKSYMISPAATOSVAIHE: "/yllapito/projekti/[oid]/hyvaksymispaatos/kuulutus",
            JATKOPAATOS_1: "/yllapito/projekti/[oid]/jatkaminen1/kuulutus",
            JATKOPAATOS_2: "/yllapito/projekti/[oid]/jatkaminen2/kuulutus",
            NAHTAVILLAOLO: "/yllapito/projekti/[oid]/nahtavillaolo/kuulutus",
          };
          await router.push({ query: { oid: projekti?.oid }, pathname: paatosPathnames[siirtymaTyyppi] });
        };
        try {
          await savePaatosAineisto(formData);
          await moveToKuulutusPage();
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
      {muokkausTila === MuokkausTila.AINEISTO_MUOKKAUS ? (
        <Stack justifyContent={{ md: "space-between" }} direction={{ xs: "column", md: "row" }}>
          <Button id="poistu_aineiston_muokkaus" type="button" onClick={open}>
            Poistu muokkaustilasta
          </Button>
          <Stack justifyContent={{ md: "flex-end" }} direction={{ xs: "column", md: "row" }}>
            <Button id="save_draft" disabled={kuulutusPaivaIsInPast} onClick={handleSubmit(saveDraft)}>
              Tallenna Luonnos
            </Button>
            <Button
              primary
              disabled={!aineistotReadyForHyvaksynta}
              id="aineistomuokkaus_send_for_approval"
              type="button"
              onClick={handleSubmit(sendForApprovalAineistoMuokkaus)}
            >
              Lähetä hyväksyttäväksi
            </Button>
          </Stack>
          <HassuDialog title="Poistu aineistojen muokkaustilasta" maxWidth="sm" open={isOpen} onClose={close}>
            <DialogContent>
              <p>
                Haluatko poistua aineistojen muokkaustilasta? Painamalla Kyllä-painiketta poistut aineistojen muokkaustilasta. Tehtyjä
                muutoksia ei tallenneta.
              </p>
            </DialogContent>
            <DialogActions>
              <Button id="accept_poistu_aineiston_muokkaus" type="button" onClick={cancelAineistoMuokkaus} primary>
                Kyllä
              </Button>
              <Button id="cancel_poistu_aineiston_muokkaus" type="button" onClick={close}>
                Peruuta
              </Button>
            </DialogActions>
          </HassuDialog>
        </Stack>
      ) : (
        <Stack justifyContent={{ md: "flex-end" }} direction={{ xs: "column", md: "row" }}>
          <Button id="save_draft" onClick={handleSubmit(saveDraft)}>
            Tallenna Luonnos
          </Button>
          <Button
            primary
            disabled={!aineistotPresentAndNoKategorisoimattomat}
            id="save_and_move_to_kuulutus_page"
            onClick={handleSubmit(saveAndMoveToKuulutusPage)}
          >
            Tallenna ja Siirry kuulutukselle
          </Button>
        </Stack>
      )}
    </Section>
  );
}
