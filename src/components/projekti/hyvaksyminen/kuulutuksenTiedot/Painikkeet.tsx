import Button from "@components/button/Button";
import HassuSpinner from "@components/HassuSpinner";
import Section from "@components/layout/Section";
import { Stack } from "@mui/material";
import { api } from "@services/api";
import log from "loglevel";
import { useRouter } from "next/router";
import React, { useState, useCallback, useRef, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { useProjekti } from "src/hooks/useProjekti";
import useSnackbars from "src/hooks/useSnackbars";
import { TilasiirtymaToiminto, TilasiirtymaTyyppi, HyvaksymisPaatosVaiheTila, Projekti } from "@services/api";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import { KuulutuksenTiedotFormValues } from "./index";
import Modaalit from "./Modaalit";

type PalautusValues = {
  syy: string;
};
interface Props {
  projekti: ProjektiLisatiedolla;
}

export default function Painikkeet({ projekti }: Props) {
  const { mutate: reloadProjekti } = useProjekti();
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const { showSuccessMessage, showErrorMessage } = useSnackbars();
  const [open, setOpen] = useState<boolean>(false);
  const [openHyvaksy, setOpenHyvaksy] = useState<boolean>(false);
  const router = useRouter();

  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true; // Will set it to true on mount ...
    return () => {
      mounted.current = false;
    }; // ... and to false on unmount
  }, []);

  const { handleSubmit, reset } = useFormContext<KuulutuksenTiedotFormValues>();

  const saveHyvaksymisPaatosVaihe = useCallback(
    async (formData: KuulutuksenTiedotFormValues) => {
      await api.tallennaProjekti(formData);
      if (reloadProjekti) await reloadProjekti();
      reset(formData);
    },
    [reloadProjekti, reset]
  );

  const saveDraft = async (formData: KuulutuksenTiedotFormValues) => {
    setIsFormSubmitting(true);
    try {
      await saveHyvaksymisPaatosVaihe(formData);
      showSuccessMessage("Tallennus onnistui!");
    } catch (e) {
      log.error("OnSubmit Error", e);
      showErrorMessage("Tallennuksessa tapahtui virhe");
    }
    if (mounted.current) {
      setIsFormSubmitting(false);
    }
  };

  const vaihdaHyvaksymisPaatosVaiheenTila = useCallback(
    async (toiminto: TilasiirtymaToiminto, viesti: string, syy?: string) => {
      if (!projekti) {
        return;
      }
      setIsFormSubmitting(true);
      try {
        await api.siirraTila({ oid: projekti.oid, toiminto, syy, tyyppi: TilasiirtymaTyyppi.HYVAKSYMISPAATOSVAIHE });
        await reloadProjekti();
        showSuccessMessage(`${viesti} onnistui`);
      } catch (error) {
        log.error(error);
        showErrorMessage("Toiminnossa tapahtui virhe");
      }
      if (mounted.current) {
        setIsFormSubmitting(false);
        setOpen(false);
        setOpenHyvaksy(false);
      }
    },
    [setIsFormSubmitting, reloadProjekti, showSuccessMessage, showErrorMessage, setOpen, projekti]
  );

  const lahetaHyvaksyttavaksi = useCallback(
    async (formData: KuulutuksenTiedotFormValues) => {
      log.debug("tallenna tiedot ja lähetä hyväksyttäväksi");
      setIsFormSubmitting(true);
      try {
        await saveHyvaksymisPaatosVaihe(formData);
        await vaihdaHyvaksymisPaatosVaiheenTila(TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI, "Lähetys");
      } catch (error) {
        log.error("Virhe hyväksyntään lähetyksessä", error);
        showErrorMessage("Hyväksyntään lähetyksessä tapahtui virhe");
      }
      if (mounted.current) {
        setIsFormSubmitting(false);
      }
    },
    [setIsFormSubmitting, saveHyvaksymisPaatosVaihe, vaihdaHyvaksymisPaatosVaiheenTila, showErrorMessage]
  );

  const palautaMuokattavaksi = useCallback(
    async (data: PalautusValues) => {
      log.debug("palauta muokattavaksi: ", data);
      await vaihdaHyvaksymisPaatosVaiheenTila(TilasiirtymaToiminto.HYLKAA, "Palautus", data.syy);
    },
    [vaihdaHyvaksymisPaatosVaiheenTila]
  );

  const palautaMuokattavaksiJaPoistu = useCallback(
    async (data: PalautusValues) => {
      log.debug("palauta muokattavaksi ja poistu: ", data);
      await vaihdaHyvaksymisPaatosVaiheenTila(TilasiirtymaToiminto.HYLKAA, "Palautus", data.syy);
      const siirtymaTimer = setTimeout(() => {
        setIsFormSubmitting(true);
        router.push(`/yllapito/projekti/${projekti?.oid}`);
      }, 1000);
      return () => {
        setIsFormSubmitting(false);
        clearTimeout(siirtymaTimer);
      };
    },
    [vaihdaHyvaksymisPaatosVaiheenTila, setIsFormSubmitting, projekti, router]
  );

  const hyvaksyKuulutus = useCallback(async () => {
    log.debug("hyväksy kuulutus");
    await vaihdaHyvaksymisPaatosVaiheenTila(TilasiirtymaToiminto.HYVAKSY, "Hyväksyminen");
  }, [vaihdaHyvaksymisPaatosVaiheenTila]);

  const voiMuokata = !projekti?.hyvaksymisPaatosVaiheJulkaisut || projekti.hyvaksymisPaatosVaiheJulkaisut.length < 1;

  const voiHyvaksya =
    projekti.hyvaksymisPaatosVaiheJulkaisut &&
    projekti.hyvaksymisPaatosVaiheJulkaisut.length &&
    projekti.hyvaksymisPaatosVaiheJulkaisut[projekti.hyvaksymisPaatosVaiheJulkaisut.length - 1].tila ===
      HyvaksymisPaatosVaiheTila.ODOTTAA_HYVAKSYNTAA &&
    projekti?.nykyinenKayttaja.onProjektipaallikko;

  return (
    <>
      {!!voiHyvaksya && (
        <Section noDivider>
          <Stack direction={["column", "column", "row"]} justifyContent={[undefined, undefined, "flex-end"]}>
            <Button
              id="button_reject"
              onClick={(e) => {
                e.preventDefault();
                setOpen(true);
              }}
            >
              Palauta
            </Button>
            <Button
              id="button_open_acceptance_dialog"
              primary
              onClick={(e) => {
                e.preventDefault();
                setOpenHyvaksy(true);
              }}
            >
              Hyväksy ja lähetä
            </Button>
          </Stack>
        </Section>
      )}
      {!!voiMuokata && (
        <>
          <Section noDivider>
            <Stack justifyContent={{ md: "flex-end" }} direction={{ xs: "column", md: "row" }}>
              <Button id="save_hyvaksymispaatosvaihe_draft" onClick={handleSubmit(saveDraft)}>
                Tallenna Luonnos
              </Button>
              <Button id="save_and_send_for_acceptance" primary onClick={handleSubmit(lahetaHyvaksyttavaksi)}>
                Lähetä Hyväksyttäväksi
              </Button>
            </Stack>
          </Section>
          <HassuSpinner open={isFormSubmitting} />
        </>
      )}
      <Modaalit
        projekti={projekti as Projekti}
        open={open}
        openHyvaksy={openHyvaksy}
        setOpen={setOpen}
        setOpenHyvaksy={setOpenHyvaksy}
        hyvaksyKuulutus={handleSubmit(hyvaksyKuulutus)}
        palautaMuokattavaksiJaPoistu={palautaMuokattavaksiJaPoistu}
        palautaMuokattavaksi={palautaMuokattavaksi}
      />
    </>
  );
}
