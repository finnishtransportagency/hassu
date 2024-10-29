import { ReactElement, useCallback, useState } from "react";
import { DialogActions, DialogContent, Stack } from "@mui/material";
import Button from "@components/button/Button";
import HassuDialog from "@components/HassuDialog";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import useApi from "src/hooks/useApi";
import { TilasiirtymaToiminto, TilasiirtymaTyyppi } from "@services/api";
import useSnackbars from "src/hooks/useSnackbars";
import log from "loglevel";
import { KeyedMutator } from "swr";
import { ProjektiLisatiedolla } from "common/ProjektiValidationContext";

type Props = {
  projekti: ProjektiLisatiedolla;
  reloadProjekti: KeyedMutator<ProjektiLisatiedolla | null>;
};

export default function KierroksenPoistoButton({ projekti, reloadProjekti }: Props): ReactElement {
  const [isOpen, setOpen] = useState(false);
  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);
  const { withLoadingSpinner, isLoading } = useLoadingSpinner();
  const { showSuccessMessage } = useSnackbars();
  const api = useApi();

  const poistaKierros = useCallback(
    () =>
      withLoadingSpinner(
        (async () => {
          try {
            await api.siirraTila({
              oid: projekti.oid,
              toiminto: TilasiirtymaToiminto.HYLKAA,
              tyyppi: TilasiirtymaTyyppi.VUOROVAIKUTUSKIERROS,
              syy: "Poistetaan luonnos",
            });
            await reloadProjekti();
            showSuccessMessage(`Luonnoksen poistaminen onnistui`);
          } catch (error) {
            log.error(error);
          }
          close();
        })()
      ),
    [api, close, projekti.oid, reloadProjekti, showSuccessMessage, withLoadingSpinner]
  );

  return (
    <Stack justifyContent={[undefined, undefined, "flex-start"]} direction={["column", "column", "row"]}>
      <Button style={{ whiteSpace: "nowrap" }} type="button" id="poista_luonnos" onClick={open} disabled={isLoading}>
        Poista luonnos
      </Button>
      <HassuDialog open={isOpen} title="Poista luonnos" onClose={close}>
        <form style={{ display: "contents" }}>
          <DialogContent>
            <p>Olet tehnyt sivulle muutoksia. Tehdyt muutokset menetetään, jos poistat kutsun luonnoksen. Haluatko poistaa luonnoksen?</p>
            <p>
              Huom! Poistamisen yhteydessä myös suunnittelun perustiedot -välilehden tiedot palautuvat aiemman kierroksen aikaiseen tilaan.
            </p>
          </DialogContent>
          <DialogActions>
            <Button primary id="accept_publish" type="button" onClick={poistaKierros}>
              Poista luonnos
            </Button>
            <Button id="cancel_publish" type="button" onClick={close}>
              Peruuta
            </Button>
          </DialogActions>
        </form>
      </HassuDialog>
    </Stack>
  );
}
