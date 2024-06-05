import Button from "@components/button/Button";
import Section from "@components/layout/Section2";
import { Stack } from "@mui/system";
import { SubmitHandler, useFormContext } from "react-hook-form";
import { TallennaHyvaksymisEsitysInput, HyvaksymisEsityksenTiedot } from "@services/api";
import React, { useCallback } from "react";
import { useHandleSubmitContext } from "src/hooks/useHandleSubmit";
import useSnackbars from "src/hooks/useSnackbars";
import log from "loglevel";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import useApi from "src/hooks/useApi";
import useHyvaksymisEsitys from "src/hooks/useHyvaksymisEsitys";
import useLeaveConfirm from "src/hooks/useLeaveConfirm";

type Props = {
  hyvaksymisesitys: HyvaksymisEsityksenTiedot;
};

const adaptFormDataForAPI: (formData: TallennaHyvaksymisEsitysInput) => TallennaHyvaksymisEsitysInput = (data) => data;

export default function TallennaLuonnosJaVieHyvaksyttavaksiPainikkeet({ hyvaksymisesitys }: Props) {
  const { showSuccessMessage } = useSnackbars();
  const {
    formState: { isDirty },
  } = useFormContext();

  const { mutate: reloadProjekti } = useHyvaksymisEsitys();

  const { withLoadingSpinner } = useLoadingSpinner();
  const { handleDraftSubmit, handleSubmit } = useHandleSubmitContext<TallennaHyvaksymisEsitysInput>();

  const api = useApi();

  const saveDraft: SubmitHandler<TallennaHyvaksymisEsitysInput> = useCallback(
    (formData) =>
      withLoadingSpinner(
        (async () => {
          try {
            const convertedFormData = await adaptFormDataForAPI(formData);
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
    (formData) =>
      withLoadingSpinner(
        (async () => {
          if (isDirty) {
            if (
              window.confirm(
                "Olet tehnyt sivulle muutoksia, joita ei ole tallennettu. Tehdyt muutokset menetetään, jos suljet muokkauksen. \n\nHaluatko poistua tallentamatta?"
              )
            ) {
              await api.suljeHyvaksymisEsityksenMuokkaus({ oid: hyvaksymisesitys.oid, versio: hyvaksymisesitys.versio });
              await reloadProjekti();
              showSuccessMessage("Muokkauksen sulkeminen onnistui");
            } else {
              throw "Abort action 'sulje muokkaus'. Please ignore this error.";
            }
          }
        })()
      ),
    [api, hyvaksymisesitys.oid, hyvaksymisesitys.versio, reloadProjekti, showSuccessMessage, withLoadingSpinner]
  );

  const lahetaHyvaksyttavaksi: SubmitHandler<TallennaHyvaksymisEsitysInput> = useCallback(
    (formData) =>
      withLoadingSpinner(
        (async () => {
          log.debug("tallenna tiedot ja lähetä hyväksyttäväksi");
          try {
            const convertedFormData = await adaptFormDataForAPI(formData);
            await api.tallennaHyvaksymisEsitys(convertedFormData);
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
          disabled={!hyvaksymisesitys.voiLahettaaHyvaksyttavaksi}
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
