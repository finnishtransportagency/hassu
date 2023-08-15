import React, { useCallback, useEffect, useRef, useState, VoidFunctionComponent } from "react";
import Button from "@components/button/Button";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import { KeyedMutator } from "swr";
import useSnackbars from "src/hooks/useSnackbars";
import log from "loglevel";
import HassuSpinner from "@components/HassuSpinner";
import useApi from "src/hooks/useApi";

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
    const { showSuccessMessage } = useSnackbars();
    const api = useApi();

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
          showSuccessMessage("Tiedot päivitetty Projektivelhosta");
        } catch (e) {
          log.log("reloadProjekti Error", e);
          if (isMounted) {
            setLoading(false);
          }
        }
      }
    }, [api, projektiOid, reloadProjekti, showSuccessMessage]);

    return (
      <>
        <Button onClick={uudelleenLataaProjekit}>Päivitä tiedot</Button>
        <HassuSpinner open={loading} />
      </>
    );
  };

export default PaivitaVelhoTiedotButton;
