import React, { useCallback, FunctionComponent } from "react";
import Button from "@components/button/Button";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import { KeyedMutator } from "swr";
import useSnackbars from "src/hooks/useSnackbars";
import log from "loglevel";
import useApi from "src/hooks/useApi";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";

const PaivitaVelhoTiedotButton: FunctionComponent<{ projektiOid: string; reloadProjekti: KeyedMutator<ProjektiLisatiedolla | null> }> = ({
  projektiOid,
  reloadProjekti,
}) => {
  const { withLoadingSpinner } = useLoadingSpinner();

  const { showSuccessMessage } = useSnackbars();
  const api = useApi();

  const uudelleenLataaProjekit = useCallback(
    () =>
      withLoadingSpinner(
        (async () => {
          if (projektiOid) {
            try {
              await api.synkronoiProjektiMuutoksetVelhosta(projektiOid);
              await reloadProjekti();
              showSuccessMessage("Tiedot päivitetty Projektivelhosta");
            } catch (e) {
              log.log("reloadProjekti Error", e);
            }
          }
        })()
      ),
    [api, projektiOid, reloadProjekti, showSuccessMessage, withLoadingSpinner]
  );

  return <Button onClick={uudelleenLataaProjekit}>Päivitä tiedot</Button>;
};

export default PaivitaVelhoTiedotButton;
