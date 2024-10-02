import React, { useCallback, useState } from "react";
import Button from "@components/button/Button";
import HassuDialog from "@components/HassuDialog";
import { api, JatkopaatettavaVaihe } from "@services/api";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import useSnackbars from "src/hooks/useSnackbars";
import router from "next/router";
import { DialogActions, DialogContent } from "@mui/material";
import log from "loglevel";

type AvaaJatkopaatettavaksiPainikeProps = {
  jatkopaatettavaVaihe: JatkopaatettavaVaihe;
  oid: string;
};

const titles: Record<JatkopaatettavaVaihe, string> = {
  JATKOPAATOS_1: "Avaa 1. jatkopäätös",
  JATKOPAATOS_2: "Avaa 2. jatkopäätös",
};

export function AvaaJatkopaatettavaksiPainike(props: AvaaJatkopaatettavaksiPainikeProps) {
  const [isOpen, setOpen] = useState(false);

  const { withLoadingSpinner } = useLoadingSpinner();
  const { showSuccessMessage } = useSnackbars();

  const openTallenna = useCallback(() => {
    setOpen(true);
  }, []);
  const closeTallenna = useCallback(() => {
    setOpen(false);
  }, []);

  const avaaJatkopaatos = useCallback(
    async () =>
      await withLoadingSpinner(
        (async () => {
          try {
            await api.avaaProjektiJatkopaatettavaksi(props.oid, props.jatkopaatettavaVaihe);
            showSuccessMessage("Projekti avattu jatkopäätettäksi");
            await new Promise((resolve) => setTimeout(resolve, 1500));
            await router.push(`/yllapito/projekti/${props.oid}/henkilot`);
          } catch (e) {
            log.log("OnSubmit Error", e);
          }
          setOpen(false);
        })()
      ),
    [withLoadingSpinner, props.oid, props.jatkopaatettavaVaihe, showSuccessMessage]
  );

  return (
    <>
      <Button type="button" id="avaa_jatkopaatettavaksi" onClick={openTallenna}>
        {titles[props.jatkopaatettavaVaihe]}
      </Button>
      <HassuDialog open={isOpen} title={titles[props.jatkopaatettavaVaihe]} onClose={closeTallenna}>
        <DialogContent>
          <div>
            <p>
              Olet avaamassa suunnitelmalle jatkopäätöksen kuulutuksen lomakkeen. Painamalla Avaa jatkopäätettäväksi -painiketta tallennat
              tiedot ja siirryt Projektin henkilöt -sivulle.
            </p>
            <p>Päivitä Projektivelhosta projektipäällikkö ajantasalle ja päivitä sen jälkeen Projektin henkilöt -sivu.</p>
          </div>
        </DialogContent>
        <DialogActions>
          <Button primary type="button" id="accept_and_save_jatkopaatos" onClick={avaaJatkopaatos}>
            Avaa jatkopäätettäväksi
          </Button>
          <Button type="button" onClick={closeTallenna}>
            Peruuta
          </Button>
        </DialogActions>
      </HassuDialog>
    </>
  );
}
