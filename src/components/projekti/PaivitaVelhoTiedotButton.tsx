import React, { useCallback, useState, VFC } from "react";
import Button from "@components/button/Button";
import { api } from "@services/api";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import { KeyedMutator } from "swr";
import useSnackbars from "src/hooks/useSnackbars";
import log from "loglevel";
import HassuSpinner from "@components/HassuSpinner";

const PaivitaVelhoTiedotButton: VFC<{ projektiOid: string; reloadProjekti: KeyedMutator<ProjektiLisatiedolla | null> }> = ({
  projektiOid,
  reloadProjekti,
}) => {
  const [loading, setLoading] = useState(false);
  const { showSuccessMessage, showErrorMessage } = useSnackbars();

  const uudelleenLataaProjekit = useCallback(async () => {
    if (projektiOid) {
      try {
        setLoading(true);
        await api.synkronoiProjektiMuutoksetVelhosta(projektiOid);
        await reloadProjekti();
        setLoading(false);
        showSuccessMessage("Projekti päivitetty");
      } catch (e) {
        setLoading(false);
        log.log("realoadProjekti Error", e);
        showErrorMessage("Päivittämisessä tapahtui virhe!");
      }
    }
  }, [projektiOid, reloadProjekti, showErrorMessage, showSuccessMessage]);

  return (
    <>
      <Button onClick={uudelleenLataaProjekit}>Päivitä tiedot</Button>
      <HassuSpinner open={loading} />
    </>
  );
};

export default PaivitaVelhoTiedotButton;
