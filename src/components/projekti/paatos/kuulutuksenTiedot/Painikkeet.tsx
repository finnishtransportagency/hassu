import Button from "@components/button/Button";
import HassuSpinner from "@components/HassuSpinner";
import Section from "@components/layout/Section";
import { Stack } from "@mui/material";
import {
  HyvaksymisPaatosVaihe,
  HyvaksymisPaatosVaiheJulkaisu,
  KuulutusJulkaisuTila,
  MuokkausTila,
  Projekti,
  Status,
  TilasiirtymaToiminto,
} from "@services/api";
import log from "loglevel";
import { useRouter } from "next/router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import useSnackbars from "src/hooks/useSnackbars";
import { KuulutuksenTiedotFormValues } from "./index";
import Modaalit from "./Modaalit";
import { projektiMeetsMinimumStatus } from "src/hooks/useIsOnAllowedProjektiRoute";
import { paatosSpecificTilasiirtymaTyyppiMap, PaatosTyyppi } from "src/util/getPaatosSpecificData";
import { convertFormDataToTallennaProjektiInput } from "./KuulutuksenJaIlmoituksenEsikatselu";
import useApi from "src/hooks/useApi";
import useIsProjektiReadyForTilaChange from "../../../../hooks/useProjektinTila";
import axios from "axios";

type PalautusValues = {
  syy: string;
};

interface Props {
  projekti: ProjektiLisatiedolla;
  julkaisu: HyvaksymisPaatosVaiheJulkaisu | null | undefined;
  paatosTyyppi: PaatosTyyppi;
  julkaisematonPaatos: HyvaksymisPaatosVaihe | null | undefined;
}

export default function Painikkeet({ projekti, julkaisu, paatosTyyppi, julkaisematonPaatos }: Props) {
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

  const { handleSubmit, trigger } = useFormContext<KuulutuksenTiedotFormValues>();

  const api = useApi();

  const talletaTiedosto = useCallback(
    async (saameTiedosto: File) => {
      const contentType = (saameTiedosto as Blob).type || "application/octet-stream";
      const response = await api.valmisteleTiedostonLataus(saameTiedosto.name, contentType);
      await axios.put(response.latausLinkki, saameTiedosto, {
        headers: {
          "Content-Type": contentType,
        },
      });
      return response.tiedostoPolku;
    },
    [api]
  );

  const saveHyvaksymisPaatosVaihe = useCallback(
    async (formData: KuulutuksenTiedotFormValues) => {
      const pohjoisSaameIlmoitusPdf = formData.hyvaksymisPaatosVaihe.hyvaksymisPaatosVaiheSaamePDFt?.POHJOISSAAME
        ?.kuulutusIlmoitusPDFPath as unknown as File | undefined | string;
      if (
        formData.hyvaksymisPaatosVaihe.hyvaksymisPaatosVaiheSaamePDFt?.POHJOISSAAME?.kuulutusIlmoitusPDFPath &&
        pohjoisSaameIlmoitusPdf instanceof File
      ) {
        formData.hyvaksymisPaatosVaihe.hyvaksymisPaatosVaiheSaamePDFt.POHJOISSAAME.kuulutusIlmoitusPDFPath = await talletaTiedosto(
          pohjoisSaameIlmoitusPdf
        );
      }
      const pohjoisSaameKuulutusPdf = formData.hyvaksymisPaatosVaihe.hyvaksymisPaatosVaiheSaamePDFt?.POHJOISSAAME
        ?.kuulutusPDFPath as unknown as File | undefined | string;
      if (
        formData.hyvaksymisPaatosVaihe.hyvaksymisPaatosVaiheSaamePDFt?.POHJOISSAAME?.kuulutusPDFPath &&
        pohjoisSaameKuulutusPdf instanceof File
      ) {
        formData.hyvaksymisPaatosVaihe.hyvaksymisPaatosVaiheSaamePDFt.POHJOISSAAME.kuulutusPDFPath = await talletaTiedosto(
          pohjoisSaameKuulutusPdf
        );
      }
      const convertedFormData = convertFormDataToTallennaProjektiInput(formData, paatosTyyppi);
      if (convertedFormData.hyvaksymisPaatosVaihe) {
        convertedFormData.hyvaksymisPaatosVaihe.hyvaksymisPaatosVaiheSaamePDFt =
          formData.hyvaksymisPaatosVaihe.hyvaksymisPaatosVaiheSaamePDFt;
      } else {
        log.error("Hyvaksymispaatosvaihe puuttuu hyvaksymispaatosvaiheen tallennuksessa");
      }
      await api.tallennaProjekti(convertedFormData);
      if (reloadProjekti) {
        await reloadProjekti();
      }
    },
    [api, paatosTyyppi, reloadProjekti]
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
        await api.siirraTila({ oid: projekti.oid, toiminto, syy, tyyppi: paatosSpecificTilasiirtymaTyyppiMap[paatosTyyppi] });
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
    [projekti, api, paatosTyyppi, reloadProjekti, showSuccessMessage, showErrorMessage]
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

  const handleClickOpenHyvaksy = useCallback(async () => {
    const result = await trigger("paatos.kuulutusPaiva");

    if (result) {
      setOpenHyvaksy(true);
    } else {
      showErrorMessage("Kuulutuspäivämärä on menneisyydessä tai virheellinen. Palauta kuulutus muokattavaksi ja korjaa päivämäärä.");
    }
  }, [showErrorMessage, trigger]);

  const voiMuokata = !julkaisematonPaatos?.muokkausTila || julkaisematonPaatos?.muokkausTila === MuokkausTila.MUOKKAUS;

  const voiHyvaksya = julkaisu?.tila === KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA && projekti?.nykyinenKayttaja.onProjektipaallikko;

  const isProjektiReadyForTilaChange = useIsProjektiReadyForTilaChange(projekti);

  return (
    <>
      {!!voiHyvaksya && (
        <Section noDivider>
          <Stack direction={["column", "column", "row"]} justifyContent={[undefined, undefined, "flex-end"]}>
            <Button
              type="button"
              id="button_reject"
              onClick={(e) => {
                e.preventDefault();
                setOpen(true);
              }}
            >
              Palauta
            </Button>
            <Button type="button" id="button_open_acceptance_dialog" primary onClick={handleClickOpenHyvaksy}>
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
              <Button
                id="save_and_send_for_acceptance"
                type="button"
                primary
                disabled={!projektiMeetsMinimumStatus(projekti, Status.HYVAKSYTTY) || !isProjektiReadyForTilaChange}
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
