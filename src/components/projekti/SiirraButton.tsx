import Button from "@components/button/Button";
import HassuDialog from "@components/HassuDialog";
import { DialogActions, DialogContent, DialogProps } from "@mui/material";
import { TilaSiirtymaInput, TilasiirtymaToiminto, TilasiirtymaTyyppi } from "@services/api";
import log from "loglevel";
import React, { useCallback, useEffect, useRef, useState, VoidFunctionComponent } from "react";
import useApi from "src/hooks/useApi";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import useSnackbars from "src/hooks/useSnackbars";
import { KeyedMutator } from "swr";
import router from "next/router";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";

export type SiirraButtonProps = { reloadProjekti: KeyedMutator<ProjektiLisatiedolla | null> } & Pick<TilaSiirtymaInput, "oid">;

const SiirraButton: VoidFunctionComponent<SiirraButtonProps> = ({ oid, reloadProjekti }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const openDialog = useCallback(() => {
    setIsDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
  }, []);

  return (
    <>
      <Button onClick={openDialog} id="siirra_button">
        Siirrä
      </Button>
      <SiirraModal open={isDialogOpen} onClose={closeDialog} oid={oid} reloadProjekti={reloadProjekti} />
    </>
  );
};

export const SiirraModal: VoidFunctionComponent<DialogProps & SiirraButtonProps> = ({ oid, reloadProjekti, onClose, ...dialogProps }) => {
  const { showErrorMessage, showSuccessMessage } = useSnackbars();

  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const closeDialog: React.MouseEventHandler<HTMLButtonElement> = useCallback((e) => onClose?.(e, "escapeKeyDown"), [onClose]);

  const api = useApi();

  const { withLoadingSpinner } = useLoadingSpinner();

  const siirraSuunnitteluun: React.MouseEventHandler<HTMLButtonElement> = useCallback(
    (event) => {
      const siirraTilaJaPaivitaSivu = async () => {
        try {
          await api.siirraTila({
            oid,
            toiminto: TilasiirtymaToiminto.PALAA,
            tyyppi: TilasiirtymaTyyppi.NAHTAVILLAOLO,
          });
          await router.push({ pathname: "/yllapito/projekti/[oid]/suunnittelu", query: { oid } });
          await reloadProjekti();
          showSuccessMessage("Projekti on palautettu suunnitteluvaiheeseen");
        } catch (error) {
          log.log("Siirrä Error", error);
          showErrorMessage("Palaaminen suunnitteluvaiheeseen epäonnistui");
        }
        closeDialog(event);
      };
      withLoadingSpinner(siirraTilaJaPaivitaSivu());
    },
    [api, closeDialog, oid, reloadProjekti, showErrorMessage, showSuccessMessage, withLoadingSpinner]
  );

  return (
    <HassuDialog title="Siirrä suunnitelma takaisin suunnitteluun" onClose={onClose} {...dialogProps}>
      <DialogContent>
        <p>
          Olet siirtämässä suunnitelmaa takaisin suunnitteluun. Tarkastathan projektipäälliköltä ennen siirtoa, että kuulutus suunnitelman
          nähtäville asettamisesta on viety asianhallintaan. Siirrä suunnitelma vasta, kun olet saanut vahvistuksen tiedostojen viennistä
          asianhallintaan.
        </p>
        <p>Klikkaamalla Siirrä -painiketta vahvistat siirtymisen valittuun vaiheeseen.</p>
      </DialogContent>
      <DialogActions>
        <Button type="button" id="avaa_uudelleenkuulutettavaksi" primary onClick={siirraSuunnitteluun}>
          Siirrä
        </Button>
        <Button type="button" id="peruuta_avaa_uudelleenkuulutettavaksi" onClick={closeDialog}>
          Peruuta
        </Button>
      </DialogActions>
    </HassuDialog>
  );
};

export default SiirraButton;
