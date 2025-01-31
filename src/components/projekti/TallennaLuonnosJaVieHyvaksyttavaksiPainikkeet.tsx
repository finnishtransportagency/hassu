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
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import useApi from "src/hooks/useApi";
import { tilaSiirtymaTyyppiToVaiheMap } from "src/util/tilaSiirtymaTyyppiToVaiheMap";
import { isAsianhallintaVaarassaTilassa } from "src/util/asianhallintaVaarassaTilassa";
import useSuomifiUser from "src/hooks/useSuomifiUser";
import { isKuntatietoMissing } from "../../util/velhoUtils";
import capitalize from "lodash/capitalize";

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
          const convertedFormData = await preSubmitFunction(formData);
          await api.tallennaProjekti(convertedFormData);
          await reloadProjekti();
          showSuccessMessage("Tallennus onnistui");
        })()
      ),
    [api, preSubmitFunction, reloadProjekti, showSuccessMessage, withLoadingSpinner]
  );

  const { data } = useSuomifiUser();
  const lahetaHyvaksyttavaksi: SubmitHandler<TFieldValues> = useCallback(
    (formData) =>
      withLoadingSpinner(
        (async () => {
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

          if (
            data?.suomifiViestitEnabled &&
            (tilasiirtymaTyyppi === TilasiirtymaTyyppi.NAHTAVILLAOLO || tilasiirtymaTyyppi === TilasiirtymaTyyppi.HYVAKSYMISPAATOSVAIHE) &&
            !projekti.omistajahaku?.status
          ) {
            puutteet.push("kiinteistönomistajat puuttuvat");
          }

          if (isAsianhallintaVaarassaTilassa(projekti, tilaSiirtymaTyyppiToVaiheMap[tilasiirtymaTyyppi])) {
            puutteet.push("asianhallinta on väärässä tilassa");
          }

          if (puutteet.length > 0) {
            const formattedPuutteet =
              puutteet.length === 1
                ? capitalize(puutteet[0])
                : puutteet.length === 2
                ? `${capitalize(puutteet[0])} ja ${puutteet[1]}`
                : `${capitalize(puutteet[0])}, ${puutteet.slice(1, -1).join(", ")}${puutteet.length > 2 ? " ja " : ""}${
                    puutteet[puutteet.length - 1]
                  }`;
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
