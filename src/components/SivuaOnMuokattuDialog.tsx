import { DialogActions, DialogContent } from "@mui/material";
import { useRouter } from "next/router";
import React, { useCallback } from "react";
import Button from "./button/Button";
import HassuDialog from "./HassuDialog";

type Props = {
  showPageHasBeenUpdatedError: boolean;
  closePageHasBeenUpdatedError: () => void;
};

export default function SivuaOnMuokattuDialog({ closePageHasBeenUpdatedError, showPageHasBeenUpdatedError }: Props) {
  const router = useRouter();

  const refreshPage = useCallback(() => {
    router.reload();
  }, [router]);

  return (
    <HassuDialog open={showPageHasBeenUpdatedError} onClose={closePageHasBeenUpdatedError} title="Tallennus epäonnistui">
      <DialogContent>
        <p>Toinen käyttäjä on muokannut sivun sisältöä. Tekemiäsi muutoksia ei voitu tallentaa.</p>
        <p>Voit nähdä tehdyt muutokset päivittämällä sivun.</p>
      </DialogContent>
      <DialogActions>
        <Button onClick={refreshPage}>Päivitä sivu</Button>
        <Button primary onClick={closePageHasBeenUpdatedError}>
          Peruuta
        </Button>
      </DialogActions>
    </HassuDialog>
  );
}
