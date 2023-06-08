import Button from "@components/button/Button";
import HassuSpinner from "@components/HassuSpinner";
import Section from "@components/layout/Section";
import { Stack } from "@mui/material";
import {
  HyvaksymisPaatosVaihe,
  HyvaksymisPaatosVaiheJulkaisu,
  KuulutusJulkaisuTila,
  MuokkausTila,
  Status,
  TilasiirtymaToiminto,
} from "@services/api";
import log from "loglevel";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { FieldPath, useFormContext } from "react-hook-form";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import useSnackbars from "src/hooks/useSnackbars";
import { KuulutuksenTiedotFormValues } from "./index";
import { projektiMeetsMinimumStatus } from "src/hooks/useIsOnAllowedProjektiRoute";
import { paatosSpecificRoutesMap, paatosSpecificTilasiirtymaTyyppiMap, PaatosTyyppi } from "src/util/getPaatosSpecificData";
import { convertFormDataToTallennaProjektiInput } from "./KuulutuksenJaIlmoituksenEsikatselu";
import useApi from "src/hooks/useApi";
import useIsProjektiReadyForTilaChange from "../../../../hooks/useProjektinTila";
import { ValidationError } from "yup";
import { createPaatosKuulutusSchema } from "../../../../schemas/paatosKuulutus";
import { lataaTiedosto } from "../../../../util/fileUtil";
import KuulutuksenPalauttaminenDialog from "@components/projekti/KuulutuksenPalauttaminenDialog";
import KuulutuksenHyvaksyminenDialog from "@components/projekti/KuulutuksenHyvaksyminenDialog";

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
  const [isOpenPalauta, setIsOpenPalauta] = useState<boolean>(false);
  const [isOpenHyvaksy, setIsOpenHyvaksy] = useState<boolean>(false);

  const mounted = useRef(false);

  const closeHyvaksy = useCallback(() => {
    setIsOpenHyvaksy(false);
  }, []);

  const openHyvaksy = useCallback(() => {
    setIsOpenHyvaksy(true);
  }, []);

  const closePalauta = useCallback(() => {
    setIsOpenPalauta(false);
  }, []);

  const openPalauta = useCallback(() => {
    setIsOpenPalauta(true);
  }, []);

  useEffect(() => {
    mounted.current = true; // Will set it to true on mount ...
    return () => {
      mounted.current = false;
    }; // ... and to false on unmount
  }, []);

  const { handleSubmit, setError, watch } = useFormContext<KuulutuksenTiedotFormValues>();

  const api = useApi();

  const talletaTiedosto = useCallback(async (tiedosto: File) => lataaTiedosto(api, tiedosto), [api]);

  const saveHyvaksymisPaatosVaihe = useCallback(
    async (formData: KuulutuksenTiedotFormValues) => {
      const { paatosVaiheAvain } = paatosSpecificRoutesMap[paatosTyyppi];
      const paatosVaihe = formData[paatosVaiheAvain];

      const pohjoisSaameIlmoitusPdf = paatosVaihe.hyvaksymisPaatosVaiheSaamePDFt?.POHJOISSAAME?.kuulutusIlmoitusPDFPath as unknown as
        | File
        | undefined
        | string;
      if (paatosVaihe?.hyvaksymisPaatosVaiheSaamePDFt?.POHJOISSAAME?.kuulutusIlmoitusPDFPath && pohjoisSaameIlmoitusPdf instanceof File) {
        paatosVaihe.hyvaksymisPaatosVaiheSaamePDFt.POHJOISSAAME.kuulutusIlmoitusPDFPath = await talletaTiedosto(pohjoisSaameIlmoitusPdf);
      }
      const pohjoisSaameKuulutusPdf = paatosVaihe.hyvaksymisPaatosVaiheSaamePDFt?.POHJOISSAAME?.kuulutusPDFPath as unknown as
        | File
        | undefined
        | string;

      if (paatosVaihe?.hyvaksymisPaatosVaiheSaamePDFt?.POHJOISSAAME?.kuulutusPDFPath && pohjoisSaameKuulutusPdf instanceof File) {
        paatosVaihe.hyvaksymisPaatosVaiheSaamePDFt.POHJOISSAAME.kuulutusPDFPath = await talletaTiedosto(pohjoisSaameKuulutusPdf);
      }
      const convertedFormData = convertFormDataToTallennaProjektiInput(formData, paatosTyyppi);
      const convertedPaatosVaihe = convertedFormData[paatosVaiheAvain];
      if (convertedPaatosVaihe) {
        convertedPaatosVaihe.hyvaksymisPaatosVaiheSaamePDFt = paatosVaihe.hyvaksymisPaatosVaiheSaamePDFt;
      } else {
        log.error("Puuttuu hyvaksymispaatosvaiheen tallennuksessa: " + paatosVaiheAvain);
      }
      await api.tallennaProjekti(convertedFormData);
      if (reloadProjekti) {
        await reloadProjekti();
      }
    },
    [api, paatosTyyppi, reloadProjekti, talletaTiedosto]
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
        setIsOpenPalauta(false);
        setIsOpenHyvaksy(false);
      }
    },
    [projekti, api, paatosTyyppi, reloadProjekti, showSuccessMessage, showErrorMessage]
  );

  const lahetaHyvaksyttavaksi = useCallback(
    async (formData: KuulutuksenTiedotFormValues) => {
      try {
        await createPaatosKuulutusSchema(paatosTyyppi).validate(formData, {
          context: { projekti, applyLahetaHyvaksyttavaksiChecks: true },
          abortEarly: false,
        });
      } catch (error) {
        if (error instanceof ValidationError) {
          const errorArray = error.inner.length ? error.inner : [error];
          errorArray.forEach((err) => {
            const { type, path, message } = err;
            if (path) {
              setError(path as FieldPath<KuulutuksenTiedotFormValues>, { type, message });
            }
          });
        }
        return;
      }

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
    [projekti, setError, saveHyvaksymisPaatosVaihe, vaihdaHyvaksymisPaatosVaiheenTila, showErrorMessage, paatosTyyppi]
  );

  const voiMuokata = !julkaisematonPaatos?.muokkausTila || julkaisematonPaatos?.muokkausTila === MuokkausTila.MUOKKAUS;

  const voiHyvaksya = julkaisu?.tila === KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA && projekti?.nykyinenKayttaja.onProjektipaallikkoTaiVarahenkilo;

  const isProjektiReadyForTilaChange = useIsProjektiReadyForTilaChange(projekti);

  const kuntavastaanottajat = watch("paatos.ilmoituksenVastaanottajat.kunnat");
  const kunnatPuuttuu = !(kuntavastaanottajat && kuntavastaanottajat.length > 0);
  return (
    <>
      {!!voiHyvaksya && (
        <Section noDivider>
          <Stack direction={["column", "column", "row"]} justifyContent={[undefined, undefined, "flex-end"]}>
            <Button type="button" id="button_reject" onClick={openPalauta}>
              Palauta
            </Button>
            <Button type="button" id="button_open_acceptance_dialog" primary onClick={openHyvaksy}>
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
                disabled={!projektiMeetsMinimumStatus(projekti, Status.HYVAKSYTTY) || !isProjektiReadyForTilaChange || kunnatPuuttuu}
                onClick={handleSubmit(lahetaHyvaksyttavaksi)}
              >
                Lähetä Hyväksyttäväksi
              </Button>
            </Stack>
          </Section>
          <HassuSpinner open={isFormSubmitting} />
        </>
      )}
      <KuulutuksenPalauttaminenDialog
        onClose={closePalauta}
        open={isOpenPalauta}
        projekti={projekti}
        setIsFormSubmitting={setIsFormSubmitting}
        tilasiirtymaTyyppi={paatosSpecificTilasiirtymaTyyppiMap[paatosTyyppi]}
      />
      <KuulutuksenHyvaksyminenDialog
        open={isOpenHyvaksy}
        projekti={projekti}
        setIsFormSubmitting={setIsFormSubmitting}
        tilasiirtymaTyyppi={paatosSpecificTilasiirtymaTyyppiMap[paatosTyyppi]}
        onClose={closeHyvaksy}
      />
    </>
  );
}
