import Button from "@components/button/Button";
import Section from "@components/layout/Section2";
import { Stack } from "@mui/system";
import { KuntaVastaanottajaInput, Status, TilasiirtymaToiminto, TilasiirtymaTyyppi } from "@services/api";
import React, { useCallback } from "react";
import { FieldValues, SubmitHandler } from "react-hook-form";
import { useHandleSubmitContext } from "src/hooks/useHandleSubmit";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import useIsProjektiReadyForTilaChange from "src/hooks/useProjektinTila";
import useSnackbars from "src/hooks/useSnackbars";
import { projektiMeetsMinimumStatus } from "src/util/routes";
import log from "loglevel";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import useApi from "src/hooks/useApi";

type Props<TFieldValues extends FieldValues> = {
  projekti: ProjektiLisatiedolla;
  saveVaihe: SubmitHandler<TFieldValues>;
  kuntavastaanottajat: KuntaVastaanottajaInput[] | null | undefined;
  tilasiirtymaTyyppi: Exclude<TilasiirtymaTyyppi, TilasiirtymaTyyppi.VUOROVAIKUTUSKIERROS>;
};

const tilasiirtymaTyyppiToStatusMap: Record<Exclude<TilasiirtymaTyyppi, TilasiirtymaTyyppi.VUOROVAIKUTUSKIERROS>, Status> = {
  ALOITUSKUULUTUS: Status.ALOITUSKUULUTUS,
  HYVAKSYMISPAATOSVAIHE: Status.HYVAKSYTTY,
  JATKOPAATOS_1: Status.JATKOPAATOS_1,
  JATKOPAATOS_2: Status.JATKOPAATOS_2,
  NAHTAVILLAOLO: Status.NAHTAVILLAOLO,
};

export default function TallennaLuonnosJaVieHyvaksyttavaksiPainikkeet<TFieldValues extends FieldValues>({
  projekti,
  saveVaihe,
  kuntavastaanottajat,
  tilasiirtymaTyyppi,
}: Props<TFieldValues>) {
  const { showSuccessMessage } = useSnackbars();

  tilasiirtymaTyyppiToStatusMap[tilasiirtymaTyyppi];

  const { mutate: reloadProjekti } = useProjekti();

  const { withLoadingSpinner } = useLoadingSpinner();
  const { handleDraftSubmit, handleSubmit } = useHandleSubmitContext<TFieldValues>();

  const api = useApi();

  const isProjektiReadyForTilaChange = useIsProjektiReadyForTilaChange(projekti);

  const saveDraft: SubmitHandler<TFieldValues> = useCallback(
    (formData) =>
      withLoadingSpinner(
        (async () => {
          try {
            await saveVaihe(formData);
            showSuccessMessage("Tallennus onnistui");
          } catch (e) {
            log.error("OnSubmit Error", e);
          }
        })()
      ),
    [saveVaihe, showSuccessMessage, withLoadingSpinner]
  );

  const vaihdaVaiheenTila = useCallback(
    async (toiminto: TilasiirtymaToiminto, viesti: string, syy?: string) =>
      withLoadingSpinner(
        (async () => {
          try {
            await api.siirraTila({ oid: projekti.oid, toiminto, syy, tyyppi: tilasiirtymaTyyppi });
            await reloadProjekti();
            showSuccessMessage(`${viesti} onnistui`);
          } catch (error) {
            log.error(error);
          }
        })()
      ),
    [withLoadingSpinner, api, projekti.oid, tilasiirtymaTyyppi, reloadProjekti, showSuccessMessage]
  );

  const lahetaHyvaksyttavaksi: SubmitHandler<TFieldValues> = useCallback(
    (formData) =>
      withLoadingSpinner(
        (async () => {
          log.debug("tallenna tiedot ja lähetä hyväksyttäväksi");
          try {
            await saveVaihe(formData);
            await vaihdaVaiheenTila(TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI, "Lähetys");
          } catch (error) {
            log.error("Virhe hyväksyntään lähetyksessä", error);
          }
        })()
      ),
    [withLoadingSpinner, saveVaihe, vaihdaVaiheenTila]
  );

  return (
    <Section noDivider>
      <Stack justifyContent={{ md: "flex-end" }} direction={{ xs: "column", md: "row" }}>
        <Button id="save_draft" type="button" onClick={handleDraftSubmit(saveDraft)}>
          Tallenna Luonnos
        </Button>
        <Button
          type="button"
          disabled={
            !projektiMeetsMinimumStatus(projekti, tilasiirtymaTyyppiToStatusMap[tilasiirtymaTyyppi]) ||
            !isProjektiReadyForTilaChange ||
            !kuntavastaanottajat?.length
          }
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
