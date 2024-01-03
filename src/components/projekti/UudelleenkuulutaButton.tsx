import Button from "@components/button/Button";
import HassuDialog from "@components/HassuDialog";
import { DialogActions, DialogContent, DialogProps } from "@mui/material";
import { TilaSiirtymaInput, TilasiirtymaToiminto } from "@services/api";
import log from "loglevel";
import React, { useCallback, useState, VoidFunctionComponent } from "react";
import useApi from "src/hooks/useApi";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import useSnackbars from "src/hooks/useSnackbars";
import { KeyedMutator } from "swr";

export type UudelleenkuulutaButtonProps = { reloadProjekti: KeyedMutator<ProjektiLisatiedolla | null> } & Pick<
  TilaSiirtymaInput,
  "oid" | "tyyppi"
>;

const UudelleenkuulutaButton: VoidFunctionComponent<UudelleenkuulutaButtonProps> = ({ oid, reloadProjekti, tyyppi }) => {
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
      <UudelleenkuulutaModal open={isDialogOpen} onClose={closeDialog} oid={oid} reloadProjekti={reloadProjekti} tyyppi={tyyppi} />
    </>
  );
};

export const UudelleenkuulutaModal: VoidFunctionComponent<DialogProps & UudelleenkuulutaButtonProps> = ({
  oid,
  reloadProjekti,
  tyyppi,
  onClose,
  ...dialogProps
}) => {
  const { showErrorMessage, showSuccessMessage } = useSnackbars();

  const closeDialog: React.MouseEventHandler<HTMLButtonElement> = useCallback((e) => onClose?.(e, "escapeKeyDown"), [onClose]);

  const api = useApi();

  const { withLoadingSpinner } = useLoadingSpinner();

  const avaaUudelleenkuulutettavaksi: React.MouseEventHandler<HTMLButtonElement> = useCallback(
    (event) => {
      withLoadingSpinner(
        (async () => {
          try {
            await api.siirraTila({
              oid,
              toiminto: TilasiirtymaToiminto.UUDELLEENKUULUTA,
              tyyppi,
            });
            await reloadProjekti();
            showSuccessMessage("Kuulutus on avattu uudelleenkuulutettavaksi");
          } catch (error) {
            log.log("Uudelleenkuulutus Error", error);
            showErrorMessage("Kuulutuksen avaaminen uudelleenkuulutettavaksi epäonnistui");
          }
          closeDialog(event);
        })()
      );
    },
    [api, closeDialog, oid, reloadProjekti, showErrorMessage, showSuccessMessage, tyyppi, withLoadingSpinner]
  );

  return (
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
  );
};

export default UudelleenkuulutaButton;
