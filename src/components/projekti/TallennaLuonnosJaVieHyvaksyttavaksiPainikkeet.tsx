import Button from "@components/button/Button";
import Section from "@components/layout/Section2";
import { Stack } from "@mui/system";
import { FieldValues, SubmitHandler } from "react-hook-form";
import { TallennaProjektiInput, KuntaVastaanottajaInput, Status, TilasiirtymaToiminto, TilasiirtymaTyyppi } from "@services/api";
import React, { useCallback } from "react";
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
import { useShowTallennaProjektiMessage } from "src/hooks/useShowTallennaProjektiMessage";
import capitalize from "lodash/capitalize";
import { isEvkJulkaisuEstetty } from "hassu-common/util/isEvkJulkaisuEstetty";
import { isElyJulkaisuEstetty } from "common/util/isElyJulkaisuEstetty";

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

const tilasiirtymaToFormFieldMap: Record<Exclude<TilasiirtymaTyyppi, TilasiirtymaTyyppi.VUOROVAIKUTUSKIERROS>, string> = {
  ALOITUSKUULUTUS: "aloitusKuulutus",
  HYVAKSYMISPAATOSVAIHE: "paatos",
  JATKOPAATOS_1: "paatos",
  JATKOPAATOS_2: "paatos",
  NAHTAVILLAOLO: "nahtavillaoloVaihe",
};

export default function TallennaLuonnosJaVieHyvaksyttavaksiPainikkeet<TFieldValues extends FieldValues>({
  projekti,
  preSubmitFunction,
  kuntavastaanottajat,
  tilasiirtymaTyyppi,
}: Readonly<Props<TFieldValues>>) {
  const showTallennaProjektiMessage = useShowTallennaProjektiMessage();
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
            const response = await api.tallennaProjekti(convertedFormData);
            await reloadProjekti();
            showTallennaProjektiMessage(response);
          } catch (e) {
            log.error("OnSubmit Error", e);
          }
        })()
      ),
    [api, preSubmitFunction, reloadProjekti, showTallennaProjektiMessage, withLoadingSpinner]
  );

  const { data } = useSuomifiUser();
  const lahetaHyvaksyttavaksi: SubmitHandler<TFieldValues> = useCallback(
    (formData) =>
      withLoadingSpinner(
        (async () => {
          try {
            const puutteet: string[] = [];
            const invalidStatus = !projektiMeetsMinimumStatus(projekti, tilasiirtymaTyyppiToStatusMap[tilasiirtymaTyyppi]);
            if (invalidStatus) {
              puutteet.push("projektin tila on väärä");
            }
            if (!isProjektiReadyForTilaChange) {
              puutteet.push("projektin aineistoja ei ole käsitelty");
            }
            const lacksKunnat = !kuntavastaanottajat?.length || isKuntatietoMissing(projekti);
            if (lacksKunnat) {
              puutteet.push("kuntavastaanottajat puuttuvat");
            }
            const formDataField = tilasiirtymaToFormFieldMap[tilasiirtymaTyyppi];
            if (isElyJulkaisuEstetty(projekti, formData[formDataField].kuulutusPaiva)) {
              puutteet.push("ELY-keskuksien julkaisut on estetty");
            }
            if (isEvkJulkaisuEstetty(projekti, formData[formDataField].kuulutusPaiva)) {
              puutteet.push("integraatio Elinvoimakeskuksen asianhallintaan ei käytettävissä");
            }
            if (
              data?.suomifiViestitEnabled &&
              (tilasiirtymaTyyppi === TilasiirtymaTyyppi.NAHTAVILLAOLO ||
                tilasiirtymaTyyppi === TilasiirtymaTyyppi.HYVAKSYMISPAATOSVAIHE) &&
              !projekti.omistajahaku?.status
            ) {
              puutteet.push("kiinteistönomistajat puuttuvat");
            }
            if (isAsianhallintaVaarassaTilassa(projekti, tilaSiirtymaTyyppiToVaiheMap[tilasiirtymaTyyppi])) {
              puutteet.push("asianhallinta on väärässä tilassa");
            }
            if (puutteet.length > 0) {
              const muut = puutteet.slice(0, -1);
              const viimeinen = puutteet[puutteet.length - 1];
              const formattedPuutteet = muut.length ? capitalize(muut.join(", ") + " ja " + viimeinen) : capitalize(viimeinen);
              showErrorMessage(formattedPuutteet);
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
          } catch (e) {
            log.error("Virhe hyväksyntään lähetyksessä", e);
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
