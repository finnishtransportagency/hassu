import Button from "@components/button/Button";
import Section from "@components/layout/Section2";
import { Stack } from "@mui/system";
import { FieldValues, SubmitHandler } from "react-hook-form";
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
  preSubmitFunction: (formData: TFieldValues) => Promise<TallennaProjektiInput>;
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
  preSubmitFunction,
  kuntavastaanottajat,
  tilasiirtymaTyyppi,
}: Readonly<Props<TFieldValues>>) {
  const { showSuccessMessage, showErrorMessage } = useSnackbars();

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

  const { data } = useSuomifiUser();
  const lahetaHyvaksyttavaksi: SubmitHandler<TFieldValues> = useCallback(
    (formData) =>
      withLoadingSpinner(
        (async () => {
          log.debug("tallenna tiedot ja lähetä hyväksyttäväksi");
          try {
            const puutteet: string[] = [];

            const invalidStatus = !projektiMeetsMinimumStatus(projekti, tilasiirtymaTyyppiToStatusMap[tilasiirtymaTyyppi]);
            if (invalidStatus) {
              puutteet.push("Projektin tila on väärä");
            }

            if (!isProjektiReadyForTilaChange) {
              puutteet.push("Projektin perustiedot ovat puutteelliset");
            }

            const lacksKunnat = !kuntavastaanottajat?.length || isKuntatietoMissing(projekti);
            if (lacksKunnat) {
              puutteet.push("Kuntavastaanottajat puuttuvat");
            }

            if (
              data?.suomifiViestitEnabled &&
              (tilasiirtymaTyyppi === TilasiirtymaTyyppi.NAHTAVILLAOLO ||
                tilasiirtymaTyyppi === TilasiirtymaTyyppi.HYVAKSYMISPAATOSVAIHE) &&
              !projekti.omistajahaku?.status
            ) {
              puutteet.push("Kiinteistönomistajat puuttuvat");
            }

            if (isAsianhallintaVaarassaTilassa(projekti, tilaSiirtymaTyyppiToVaiheMap[tilasiirtymaTyyppi])) {
              puutteet.push("Asianhallinta on väärässä tilassa");
            }

            if (puutteet.length > 0) {
              showErrorMessage(puutteet.join(", "));
              return;
            }
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
            showErrorMessage("Virhe hyväksyttäväksi lähetyksessä");
          }
        })()
      ),
    [
      api,
      preSubmitFunction,
      reloadProjekti,
      showSuccessMessage,
      showErrorMessage,
      tilasiirtymaTyyppi,
      withLoadingSpinner,
      projekti,
      isProjektiReadyForTilaChange,
      kuntavastaanottajat,
      data?.suomifiViestitEnabled,
    ]
  );

  return (
    <Section noDivider>
      <Stack justifyContent={{ md: "flex-end" }} direction={{ xs: "column", md: "row" }}>
        <Button id="save_draft" type="button" onClick={handleDraftSubmit(saveDraft)}>
          Tallenna Luonnos
        </Button>
        <Button type="button" id="save_and_send_for_acceptance" primary onClick={handleSubmit(lahetaHyvaksyttavaksi)}>
          Lähetä Hyväksyttäväksi
        </Button>
      </Stack>
    </Section>
  );
}
