import Button from "@components/button/Button";
import Section from "@components/layout/Section2";
import { Stack } from "@mui/system";
import { FieldValues, SubmitHandler, UnpackNestedValue } from "react-hook-form";
import { TallennaProjektiInput, KuntaVastaanottajaInput, Status, TilasiirtymaToiminto, TilasiirtymaTyyppi } from "@services/api";
import React, { useCallback, useMemo } from "react";
import { useHandleSubmitContext } from "src/hooks/useHandleSubmit";
import { useProjekti } from "src/hooks/useProjekti";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import useIsProjektiReadyForTilaChange from "src/hooks/useProjektinTila";
import useSnackbars from "src/hooks/useSnackbars";
import { projektiMeetsMinimumStatus } from "src/util/routes";
import log from "loglevel";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import useApi from "src/hooks/useApi";
import { tilaSiirtymaTyyppiToVaiheMap } from "src/util/tilaSiirtymaTyyppiToVaiheMap";
import { isAsianhallintaVaarassaTilassa } from "src/util/asianhallintaVaarassaTilassa";
import useSuomifiUser from "src/hooks/useSuomifiUser";
import { isKuntatietoMissing } from "../../util/velhoUtils";

type Props<TFieldValues extends FieldValues> = {
  projekti: ProjektiLisatiedolla;
  preSubmitFunction: (formData: UnpackNestedValue<TFieldValues>) => Promise<TallennaProjektiInput>;
  kuntavastaanottajat: KuntaVastaanottajaInput[] | null | undefined;
  tilasiirtymaTyyppi: Exclude<TilasiirtymaTyyppi, TilasiirtymaTyyppi.VUOROVAIKUTUSKIERROS>;
};

const tilasiirtymaTyyppiToStatusMap: Record<Exclude<TilasiirtymaTyyppi, TilasiirtymaTyyppi.VUOROVAIKUTUSKIERROS>, Status> = {
  ALOITUSKUULUTUS: Status.ALOITUSKUULUTUS,
  HYVAKSYMISPAATOSVAIHE: Status.HYVAKSYTTY,
  JATKOPAATOS_1: Status.JATKOPAATOS_1,
  JATKOPAATOS_2: Status.JATKOPAATOS_2,
  NAHTAVILLAOLO: Status.NAHTAVILLAOLO,
  HYVAKSYMISESITYS: Status.NAHTAVILLAOLO,
};

export default function TallennaLuonnosJaVieHyvaksyttavaksiPainikkeet<TFieldValues extends FieldValues>({
  projekti,
  preSubmitFunction,
  kuntavastaanottajat,
  tilasiirtymaTyyppi,
}: Props<TFieldValues>) {
  const { showSuccessMessage } = useSnackbars();

  const { mutate: reloadProjekti } = useProjekti();

  const { withLoadingSpinner } = useLoadingSpinner();
  const { handleDraftSubmit, handleSubmit } = useHandleSubmitContext<TFieldValues>();

  const api = useApi();

  const isProjektiReadyForTilaChange = useIsProjektiReadyForTilaChange();

  const saveDraft: SubmitHandler<TFieldValues> = useCallback(
    (formData) =>
      withLoadingSpinner(
        (async () => {
          try {
            const convertedFormData = await preSubmitFunction(formData);
            await api.tallennaProjekti(convertedFormData);
            await reloadProjekti();
            showSuccessMessage("Tallennus onnistui");
          } catch (e) {
            log.error("OnSubmit Error", e);
          }
        })()
      ),
    [api, preSubmitFunction, reloadProjekti, showSuccessMessage, withLoadingSpinner]
  );

  const lahetaHyvaksyttavaksi: SubmitHandler<TFieldValues> = useCallback(
    (formData) =>
      withLoadingSpinner(
        (async () => {
          log.debug("tallenna tiedot ja lähetä hyväksyttäväksi");
          try {
            const convertedFormData = await preSubmitFunction(formData);
            await api.tallennaJaSiirraTilaa(convertedFormData, {
              oid: convertedFormData.oid,
              tyyppi: tilasiirtymaTyyppi,
              toiminto: TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI,
            });
            showSuccessMessage("Tallennus ja hyväksyttäväksi lähettäminen onnistui");
            reloadProjekti();
          } catch (error) {
            log.error("Virhe hyväksyntään lähetyksessä", error);
          }
        })()
      ),
    [api, preSubmitFunction, reloadProjekti, showSuccessMessage, tilasiirtymaTyyppi, withLoadingSpinner]
  );
  const { data } = useSuomifiUser();
  const tallennaHyvaksyttavaksiDisabled = useMemo(() => {
    const invalidStatus = !projektiMeetsMinimumStatus(projekti, tilasiirtymaTyyppiToStatusMap[tilasiirtymaTyyppi]);
    const lacksKunnat = !kuntavastaanottajat?.length || isKuntatietoMissing(projekti);
    let kiinteistonomistajatOk = true;
    if (
      data?.suomifiViestitEnabled &&
      (tilasiirtymaTyyppi === TilasiirtymaTyyppi.NAHTAVILLAOLO || tilasiirtymaTyyppi === TilasiirtymaTyyppi.HYVAKSYMISPAATOSVAIHE) &&
      !projekti.omistajahaku?.status
    ) {
      kiinteistonomistajatOk = false;
    }
    return (
      invalidStatus ||
      !isProjektiReadyForTilaChange ||
      lacksKunnat ||
      !kiinteistonomistajatOk ||
      isAsianhallintaVaarassaTilassa(projekti, tilaSiirtymaTyyppiToVaiheMap[tilasiirtymaTyyppi])
    );
  }, [isProjektiReadyForTilaChange, kuntavastaanottajat?.length, projekti, tilasiirtymaTyyppi, data?.suomifiViestitEnabled]);

  return (
    <Section noDivider>
      <Stack justifyContent={{ md: "flex-end" }} direction={{ xs: "column", md: "row" }}>
        <Button id="save_draft" type="button" onClick={handleDraftSubmit(saveDraft)}>
          Tallenna Luonnos
        </Button>
        <Button
          type="button"
          disabled={tallennaHyvaksyttavaksiDisabled}
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
