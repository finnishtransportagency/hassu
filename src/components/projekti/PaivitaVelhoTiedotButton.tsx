import React, { useCallback, useEffect, useRef, useState, VoidFunctionComponent } from "react";
import Button from "@components/button/Button";
import { api } from "@services/api";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import { KeyedMutator } from "swr";
import useSnackbars from "src/hooks/useSnackbars";
import log from "loglevel";
import HassuSpinner from "@components/HassuSpinner";

const PaivitaVelhoTiedotButton: VoidFunctionComponent<{ projektiOid: string; reloadProjekti: KeyedMutator<ProjektiLisatiedolla | null> }> =
  ({ projektiOid, reloadProjekti }) => {
    const mountedRef = useRef(false);

    useEffect(() => {
      mountedRef.current = true;
      return () => {
        mountedRef.current = false;
      };
    }, []);

    const [loading, setLoading] = useState(false);
    const { showSuccessMessage, showErrorMessage } = useSnackbars();

    const uudelleenLataaProjekit = useCallback(async () => {
      const isMounted = mountedRef.current;
      if (projektiOid) {
        try {
          if (isMounted) {
            setLoading(true);
          }
          await api.synkronoiProjektiMuutoksetVelhosta(projektiOid);
          await reloadProjekti();
          if (isMounted) {
            setLoading(false);
          }
          showSuccessMessage("Projekti päivitetty");
        } catch (e) {
          log.log("realoadProjekti Error", e);
          if (isMounted) {
            setLoading(false);
            showErrorMessage("Päivittämisessä tapahtui virhe!");
          }
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
