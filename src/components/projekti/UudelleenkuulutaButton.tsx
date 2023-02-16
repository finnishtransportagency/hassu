import Button from "@components/button/Button";
import HassuDialog from "@components/HassuDialog";
import HassuSpinner from "@components/HassuSpinner";
import { DialogActions, DialogContent, DialogProps } from "@mui/material";
import { TilaSiirtymaInput, TilasiirtymaToiminto } from "@services/api";
import log from "loglevel";
import React, { useCallback, useEffect, useRef, useState, VoidFunctionComponent } from "react";
import useApi from "src/hooks/useApi";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";
import useSnackbars from "src/hooks/useSnackbars";
import { KeyedMutator } from "swr";

export type UudelleenkuulutaButtonProps = { reloadProjekti: KeyedMutator<ProjektiLisatiedolla | null> } & Pick<
  TilaSiirtymaInput,
  "oid" | "tyyppi"
>;

const UudelleenkuulutaButton: VoidFunctionComponent<UudelleenkuulutaButtonProps> = (props) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const openDialog = useCallback(() => {
    setIsDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
  }, []);

  return (
    <>
      <Button onClick={openDialog} id="uudelleenkuuluta_button">
        Uudelleenkuuluta
      </Button>
      <UudelleenkuulutaModal open={isDialogOpen} onClose={closeDialog} buttonProps={props} />
    </>
  );
};

const UudelleenkuulutaModal: VoidFunctionComponent<DialogProps & { buttonProps: UudelleenkuulutaButtonProps }> = ({
  buttonProps: { oid, reloadProjekti, tyyppi },
  onClose,
  ...dialogProps
}) => {
  const { showErrorMessage, showSuccessMessage } = useSnackbars();
  const [isLoading, setIsLoading] = useState(false);

  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const closeDialog: React.MouseEventHandler<HTMLButtonElement> = useCallback((e) => onClose?.(e, "escapeKeyDown"), [onClose]);

  const { api } = useApi();

  const avaaUudelleenkuulutettavaksi: React.MouseEventHandler<HTMLButtonElement> = useCallback(
    async (event) => {
      const isMounted = mountedRef.current;

      if (isMounted) {
        setIsLoading(true);
      }
      try {
        await api.siirraTila({
          oid,
          toiminto: TilasiirtymaToiminto.UUDELLEENKUULUTA,
          tyyppi,
        });
        if (isMounted) {
          await reloadProjekti();
          showSuccessMessage("Kuulutus on avattu uudelleenkuulutettavaksi");
        }
      } catch (error) {
        log.log("Uudelleenkuulutus Error", error);
        if (isMounted) {
          showErrorMessage("Kuulutuksen avaaminen uudelleenkuulutettavaksi epäonnistui");
        }
      }
      if (isMounted) {
        closeDialog(event);
        setIsLoading(false);
      }
    },
    [api, closeDialog, oid, reloadProjekti, showErrorMessage, showSuccessMessage, tyyppi]
  );

  return (
    <>
      <HassuDialog title="Uudelleenkuuluta kuulutus" onClose={onClose} {...dialogProps}>
        <DialogContent>
          <p>
            Olet avaamassa kuulutusta uudelleenkuulutettavaksi. Tarkastathan projektipäälliköltä ennen uuden kuulutuksen avaamista, että
            olemassaolevan kuulutuksen pdf-tiedostot on viety asianhallintaan. Avaa suunnitelma uudelleenkuulutettavaksi vasta, kun olet
            saanut vahvistuksen tiedostojen viennistä asianhallintaan.
          </p>
          <p>
            Klikkaamalla Kyllä -painiketta vahvistat kuulutuksen avaamisen muokattavaksi. Kuulutus avataan muokkaustilassa automaattisesti
            painikkeen klikkaamisen jälkeen.
          </p>
        </DialogContent>
        <DialogActions>
          <Button type="button" id="avaa_uudelleenkuulutettavaksi" primary onClick={avaaUudelleenkuulutettavaksi}>
            Kyllä
          </Button>
          <Button type="button" id="peruuta_avaa_uudelleenkuulutettavaksi" onClick={closeDialog}>
            Peruuta
          </Button>
        </DialogActions>
      </HassuDialog>
      <HassuSpinner open={isLoading} />
    </>
  );
};

export default UudelleenkuulutaButton;
