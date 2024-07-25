import Button from "@components/button/Button";
import Section from "@components/layout/Section2";
import { Stack } from "@mui/system";
import { SubmitHandler, useFormContext } from "react-hook-form";
import { TallennaHyvaksymisEsitysInput, HyvaksymisEsityksenTiedot } from "@services/api";
import React, { useCallback, useMemo } from "react";
import { useHandleSubmitContext } from "src/hooks/useHandleSubmit";
import useSnackbars from "src/hooks/useSnackbars";
import log from "loglevel";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import useApi from "src/hooks/useApi";
import useHyvaksymisEsitys from "src/hooks/useHyvaksymisEsitys";
import useLeaveConfirm from "src/hooks/useLeaveConfirm";
import { HyvaksymisEsitysForm, transformHyvaksymisEsitysFormToTallennaHyvaksymisEsitysInput } from "../hyvaksymisEsitysFormUtil";
import { aineistoKategoriat, kategorisoimattomatId } from "common/aineistoKategoriat";

type Props = {
  hyvaksymisesitys: HyvaksymisEsityksenTiedot;
};

const adaptFormDataForAPI: (formData: HyvaksymisEsitysForm) => TallennaHyvaksymisEsitysInput = (data) => {
  return transformHyvaksymisEsitysFormToTallennaHyvaksymisEsitysInput(data);
};

export default function MuokkausLomakePainikkeet({ hyvaksymisesitys }: Props) {
  const { showSuccessMessage } = useSnackbars();
  const {
    formState: { isDirty },
    watch,
  } = useFormContext<HyvaksymisEsitysForm>();

  const suunnitelma = watch("muokattavaHyvaksymisEsitys.suunnitelma");
  const muuAineistoVelhosta = watch("muokattavaHyvaksymisEsitys.muuAineistoVelhosta");

  const lomakkeenAineistotKunnossa = useMemo(() => {
    const uusiSuunnitelmaAineisto = Object.values(suunnitelma)
      .flat()
      ?.some((aineisto) => !hyvaksymisesitys.hyvaksymisEsitys?.suunnitelma?.some((a) => a.uuid === aineisto.uuid));
    const uusiMuuAineistoVelhosta = muuAineistoVelhosta?.some(
      (aineisto) => !hyvaksymisesitys.hyvaksymisEsitys?.muuAineistoVelhosta?.some((a) => a.uuid === aineisto.uuid)
    );
    const suunnitelmaAineistojaTuomatta = !!hyvaksymisesitys.hyvaksymisEsitys?.suunnitelma?.some((aineisto) => !aineisto.tuotu);
    const suunnitelmaAineistoKategorisoimatta = !!hyvaksymisesitys.hyvaksymisEsitys?.suunnitelma?.some(
      (aineisto) =>
        !aineisto.kategoriaId ||
        aineisto.kategoriaId === kategorisoimattomatId ||
        !aineistoKategoriat.listKategoriaIds().includes(aineisto.kategoriaId)
    );
    const velhoAineistojaTuomatta = !!hyvaksymisesitys.hyvaksymisEsitys?.muuAineistoVelhosta?.some((aineisto) => !aineisto.tuotu);
    return (
      uusiSuunnitelmaAineisto ||
      uusiMuuAineistoVelhosta ||
      suunnitelmaAineistojaTuomatta ||
      velhoAineistojaTuomatta ||
      suunnitelmaAineistoKategorisoimatta
    );
  }, [hyvaksymisesitys.hyvaksymisEsitys, muuAineistoVelhosta, suunnitelma]);

  const { mutate: reloadProjekti } = useHyvaksymisEsitys();

  const { withLoadingSpinner } = useLoadingSpinner();
  const { handleDraftSubmit, handleSubmit } = useHandleSubmitContext<HyvaksymisEsitysForm>();

  const api = useApi();

  const saveDraft: SubmitHandler<HyvaksymisEsitysForm> = useCallback(
    (formData) =>
      withLoadingSpinner(
        (async () => {
          try {
            const convertedFormData = adaptFormDataForAPI(formData);
            await api.tallennaHyvaksymisEsitys(convertedFormData);
            await reloadProjekti();
            showSuccessMessage("Tallennus onnistui");
          } catch (e) {
            log.error("OnSubmit Error", e);
          }
        })()
      ),
    [api, reloadProjekti, showSuccessMessage, withLoadingSpinner]
  );

  useLeaveConfirm(isDirty);

  const suljeMuokkaus = useCallback(
    () =>
      withLoadingSpinner(
        (async () => {
          if (
            !isDirty ||
            window.confirm(
              "Olet tehnyt sivulle muutoksia, joita ei ole tallennettu. Tehdyt muutokset menetetään, jos suljet muokkauksen. \n\nHaluatko poistua tallentamatta?"
            )
          ) {
            await api.suljeHyvaksymisEsityksenMuokkaus({ oid: hyvaksymisesitys.oid, versio: hyvaksymisesitys.versio });
            await reloadProjekti();
            showSuccessMessage("Muokkauksen sulkeminen onnistui");
          }
        })()
      ),
    [api, hyvaksymisesitys.oid, hyvaksymisesitys.versio, isDirty, reloadProjekti, showSuccessMessage, withLoadingSpinner]
  );

  const lahetaHyvaksyttavaksi: SubmitHandler<HyvaksymisEsitysForm> = useCallback(
    (formData) =>
      withLoadingSpinner(
        (async () => {
          log.debug("tallenna tiedot ja lähetä hyväksyttäväksi");
          try {
            const convertedFormData = adaptFormDataForAPI(formData);
            await api.tallennaHyvaksymisEsitysJaLahetaHyvaksyttavaksi(convertedFormData);
            showSuccessMessage("Tallennus ja hyväksyttäväksi lähettäminen onnistui");
            reloadProjekti();
          } catch (error) {
            log.error("Virhe hyväksyntään lähetyksessä", error);
          }
        })()
      ),
    [api, reloadProjekti, showSuccessMessage, withLoadingSpinner]
  );

  return (
    <Section noDivider>
      <Stack justifyContent={{ md: "flex-end" }} direction={{ xs: "column", md: "row" }}>
        {hyvaksymisesitys.hyvaksymisEsitys?.hyvaksymisPaiva && (
          <Button id="save" style={{ float: "left" }} type="button" onClick={suljeMuokkaus}>
            Sulje muokkaus
          </Button>
        )}
        <Button id="save_draft" type="button" onClick={handleDraftSubmit(saveDraft)}>
          Tallenna Luonnos
        </Button>
        <Button
          type="button"
          disabled={lomakkeenAineistotKunnossa}
          id="save_and_send_for_acceptance"
          primary
          onClick={handleSubmit(lahetaHyvaksyttavaksi)}
        >
          Lähetä Hyväksyttäväksi
        </Button>
      </Stack>
    </Section>
  );
}
