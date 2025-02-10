import { Fetcher, SWRConfiguration } from "swr";
import { TallennaProjektiResponse, TallennaProjektiStatus } from "@services/api";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import { useCallback } from "react";
import useSnackbars from "./useSnackbars";

export type useProjektiOptions = SWRConfiguration<ProjektiLisatiedolla | null, any, Fetcher<ProjektiLisatiedolla | null>> | undefined;

export function useShowTallennaProjektiMessage() {
  const { showSuccessMessage, showErrorMessage } = useSnackbars();

  return useCallback(
    (response: TallennaProjektiResponse) => {
      const showMessageForStatus: Record<TallennaProjektiStatus, () => void> = {
        OK: () => showSuccessMessage("Tallennus onnistui"),
        VELHO_TALLENNUS_ERROR: () => {
          const virkkeet: string[] = [
            "Tiedot tallennettu VLS-järjestelmään, mutta tietojen vieminen Projektivelhoon epäonnistui.",
            "Voit yrittää tallentamista myöhemmin uudelleen.",
          ];
          if (response.correlationId) {
            virkkeet.push("Välitä tunnistetieto '" + response.correlationId + "' järjestelmän ylläpitäjälle vikailmoituksen yhteydessä.");
          }
          showErrorMessage(virkkeet.join(" "));
        },
      };
      return showMessageForStatus[response.status]();
    },
    [showErrorMessage, showSuccessMessage]
  );
}
