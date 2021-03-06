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
import { TilasiirtymaToiminto, TilasiirtymaTyyppi, NahtavillaoloVaiheTila, Projekti } from "@services/api";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import { KuulutuksenTiedotFormValues } from "./KuulutuksenTiedot";
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

  const { handleSubmit } = useFormContext<KuulutuksenTiedotFormValues>();

  const saveSuunnitteluvaihe = useCallback(
    async (formData: KuulutuksenTiedotFormValues) => {
      await api.tallennaProjekti(formData);
      if (reloadProjekti) await reloadProjekti();
    },
    [reloadProjekti]
  );

  const saveDraft = async (formData: KuulutuksenTiedotFormValues) => {
    setIsFormSubmitting(true);
    try {
      await saveSuunnitteluvaihe(formData);
      showSuccessMessage("Tallennus onnistui!");
    } catch (e) {
      log.error("OnSubmit Error", e);
      showErrorMessage("Tallennuksessa tapahtui virhe");
    }
    if (mounted.current) {
      setIsFormSubmitting(false);
    }
  };

  const vaihdaNahtavillaolonTila = useCallback(
    async (toiminto: TilasiirtymaToiminto, viesti: string, syy?: string) => {
      if (!projekti) {
        return;
      }
      setIsFormSubmitting(true);
      try {
        await api.siirraTila({ oid: projekti.oid, toiminto, syy, tyyppi: TilasiirtymaTyyppi.NAHTAVILLAOLO });
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
      log.debug("tallenna tiedot ja l??het?? hyv??ksytt??v??ksi");
      setIsFormSubmitting(true);
      try {
        await saveSuunnitteluvaihe(formData);
        await vaihdaNahtavillaolonTila(TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI, "L??hetys");
      } catch (error) {
        log.error("Virhe hyv??ksynt????n l??hetyksess??", error);
        showErrorMessage("Hyv??ksynt????n l??hetyksess?? tapahtui virhe");
      }
      if (mounted.current) {
        setIsFormSubmitting(false);
      }
    },
    [setIsFormSubmitting, saveSuunnitteluvaihe, vaihdaNahtavillaolonTila, showErrorMessage]
  );

  const palautaMuokattavaksi = useCallback(
    async (data: PalautusValues) => {
      log.debug("palauta muokattavaksi: ", data);
      await vaihdaNahtavillaolonTila(TilasiirtymaToiminto.HYLKAA, "Palautus", data.syy);
    },
    [vaihdaNahtavillaolonTila]
  );

  const palautaMuokattavaksiJaPoistu = useCallback(
    async (data: PalautusValues) => {
      log.debug("palauta muokattavaksi ja poistu: ", data);
      await vaihdaNahtavillaolonTila(TilasiirtymaToiminto.HYLKAA, "Palautus", data.syy);
      const siirtymaTimer = setTimeout(() => {
        setIsFormSubmitting(true);
        router.push(`/yllapito/projekti/${projekti?.oid}`);
      }, 1000);
      return () => {
        setIsFormSubmitting(false);
        clearTimeout(siirtymaTimer);
      };
    },
    [vaihdaNahtavillaolonTila, setIsFormSubmitting, projekti, router]
  );

  const hyvaksyKuulutus = useCallback(async () => {
    log.debug("hyv??ksy kuulutus");
    await vaihdaNahtavillaolonTila(TilasiirtymaToiminto.HYVAKSY, "Hyv??ksyminen");
  }, [vaihdaNahtavillaolonTila]);

  const voiMuokata = !projekti?.nahtavillaoloVaiheJulkaisut || projekti.nahtavillaoloVaiheJulkaisut.length < 1;

  const voiHyvaksya =
    projekti.nahtavillaoloVaiheJulkaisut &&
    projekti.nahtavillaoloVaiheJulkaisut.length &&
    projekti.nahtavillaoloVaiheJulkaisut[projekti.nahtavillaoloVaiheJulkaisut.length - 1].tila ===
      NahtavillaoloVaiheTila.ODOTTAA_HYVAKSYNTAA &&
    projekti?.nykyinenKayttaja.onProjektipaallikko;

  return (
    <>
      {!!voiHyvaksya && (
        <Section noDivider>
          <Stack direction={["column", "column", "row"]} justifyContent={[undefined, undefined, "flex-end"]}>
            <Button id="button_reject" onClick={() => setOpen(true)}>
              Palauta
            </Button>
            <Button id="button_open_acceptance_dialog" primary onClick={() => setOpenHyvaksy(true)}>
              Hyv??ksy ja l??het??
            </Button>
          </Stack>
        </Section>
      )}
      {!!voiMuokata && (
        <>
          <Section noDivider>
            <Stack justifyContent={{ md: "flex-end" }} direction={{ xs: "column", md: "row" }}>
              <Button onClick={handleSubmit(saveDraft)}>Tallenna Luonnos</Button>
              <Button primary onClick={handleSubmit(lahetaHyvaksyttavaksi)}>
                L??het?? Hyv??ksytt??v??ksi
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
