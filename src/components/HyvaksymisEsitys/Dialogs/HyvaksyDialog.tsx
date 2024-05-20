import HassuDialog from "@components/HassuDialog";
import Button from "@components/button/Button";
import { DialogActions, DialogContent } from "@mui/material";
import log from "loglevel";
import React, { useCallback } from "react";
import useApi from "src/hooks/useApi";
import useSnackbars from "src/hooks/useSnackbars";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import useHyvaksymisEsitys from "src/hooks/useHyvaksymisEsitys";
import { SahkopostiVastaanottaja } from "@services/api";

type Props = {
  open: boolean;
  onClose: () => void;
  oid: string;
  versio: number;
  vastaanottajat: SahkopostiVastaanottaja[];
};

export default function HyvaksyDialog({ open, onClose, oid, versio, vastaanottajat }: Props) {
  const api = useApi();
  const { mutate: reloadProjekti } = useHyvaksymisEsitys();
  const { showSuccessMessage } = useSnackbars();

  const { withLoadingSpinner } = useLoadingSpinner();

  const hyvaksyKuulutus = useCallback(
    () =>
      withLoadingSpinner(
        (async () => {
          try {
            await api.hyvaksyHyvaksymisEsitys({ oid, versio });
            await reloadProjekti();
            showSuccessMessage(`Hyväksyminen onnistui`);
          } catch (error) {
            log.error(error);
          }
          onClose();
          log.debug("hyväksy kuulutus");
        })()
      ),
    [api, oid, onClose, reloadProjekti, showSuccessMessage, versio, withLoadingSpinner]
  );

  return (
    <HassuDialog title={"Hyväksymisesityksen hyväksyminen"} hideCloseButton open={open} onClose={onClose} maxWidth={"sm"}>
      <form style={{ display: "contents" }}>
        <DialogContent>
          <p>Olet hyväksymässä hyväksymisesityksen seuraaville tahoille</p>

          <ul className="vayla-dialog-list">
            {vastaanottajat?.map(({ sahkoposti }) => (
              <li key={sahkoposti}>{sahkoposti}</li>
            ))}
          </ul>
          <p>Hyväksymisesitystä pystyy vapaasti päivittämään lähetyksen jälkeen.</p>
          <p>Klikkaamalla Hyväksy ja lähetä -painiketta vahvistat hyväksymisesityksen tarkistetuksi ja lähetät vastaanottajille.</p>
        </DialogContent>

        <DialogActions>
          <Button id="accept_kuulutus" primary type="button" onClick={hyvaksyKuulutus}>
            Hyväksy ja lähetä
          </Button>
          <Button type="button" onClick={onClose}>
            Peruuta
          </Button>
        </DialogActions>
      </form>
    </HassuDialog>
  );
}
