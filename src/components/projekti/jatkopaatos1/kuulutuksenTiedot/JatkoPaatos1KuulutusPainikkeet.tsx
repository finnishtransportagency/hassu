import Button from "@components/button/Button";
import HassuSpinner from "@components/HassuSpinner";
import Section from "@components/layout/Section";
import { Stack } from "@mui/material";
import { api, Status } from "@services/api";
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
import { projektiMeetsMinimumStatus } from "src/hooks/useIsOnAllowedProjektiRoute";

type PalautusValues = {
  syy: string;
};
interface Props {
  projekti: ProjektiLisatiedolla;
}

export default function JatkoPaatos1KuulutusPainikkeet({ projekti }: Props) {
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

  const saveDraft = useCallback(async (formData: KuulutuksenTiedotFormValues) => {
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
  }, [saveHyvaksymisPaatosVaihe, showErrorMessage, showSuccessMessage]);

  const vaihdaJatkoPaatos1VaiheenTila = useCallback(
    async (toiminto: TilasiirtymaToiminto, viesti: string, syy?: string) => {
      if (!projekti) {
        return;
      }
      setIsFormSubmitting(true);
      try {
        await api.siirraTila({ oid: projekti.oid, toiminto, syy, tyyppi: TilasiirtymaTyyppi.JATKOPAATOS_1 });
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
        await vaihdaJatkoPaatos1VaiheenTila(TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI, "Lähetys");
      } catch (error) {
        log.error("Virhe hyväksyntään lähetyksessä", error);
        showErrorMessage("Hyväksyntään lähetyksessä tapahtui virhe");
      }
      if (mounted.current) {
        setIsFormSubmitting(false);
      }
    },
    [setIsFormSubmitting, saveHyvaksymisPaatosVaihe, vaihdaJatkoPaatos1VaiheenTila, showErrorMessage]
  );

  const palautaMuokattavaksi = useCallback(
    async (data: PalautusValues) => {
      log.debug("palauta muokattavaksi: ", data);
      await vaihdaJatkoPaatos1VaiheenTila(TilasiirtymaToiminto.HYLKAA, "Palautus", data.syy);
    },
    [vaihdaJatkoPaatos1VaiheenTila]
  );

  const palautaMuokattavaksiJaPoistu = useCallback(
    async (data: PalautusValues) => {
      log.debug("palauta muokattavaksi ja poistu: ", data);
      await vaihdaJatkoPaatos1VaiheenTila(TilasiirtymaToiminto.HYLKAA, "Palautus", data.syy);
      const siirtymaTimer = setTimeout(() => {
        setIsFormSubmitting(true);
        router.push(`/yllapito/projekti/${projekti?.oid}`);
      }, 1000);
      return () => {
        setIsFormSubmitting(false);
        clearTimeout(siirtymaTimer);
      };
    },
    [vaihdaJatkoPaatos1VaiheenTila, setIsFormSubmitting, projekti, router]
  );

  const hyvaksyKuulutus = useCallback(async () => {
    log.debug("hyväksy kuulutus");
    await vaihdaJatkoPaatos1VaiheenTila(TilasiirtymaToiminto.HYVAKSY, "Hyväksyminen");
  }, [vaihdaJatkoPaatos1VaiheenTila]);

  const voiMuokata = !projekti?.jatkoPaatos1VaiheJulkaisut || projekti.jatkoPaatos1VaiheJulkaisut.length < 1;

  const voiHyvaksya =
    projekti.jatkoPaatos1VaiheJulkaisut &&
    projekti.jatkoPaatos1VaiheJulkaisut.length &&
    projekti.jatkoPaatos1VaiheJulkaisut[projekti.jatkoPaatos1VaiheJulkaisut.length - 1].tila ===
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
              <Button id="save_jatkopaatos1vaihe_draft" onClick={handleSubmit(saveDraft)}>
                Tallenna Luonnos
              </Button>
              <Button
                id="save_and_send_for_acceptance"
                primary
                disabled={!projektiMeetsMinimumStatus(projekti, Status.HYVAKSYTTY)}
                onClick={handleSubmit(lahetaHyvaksyttavaksi)}
              >
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
