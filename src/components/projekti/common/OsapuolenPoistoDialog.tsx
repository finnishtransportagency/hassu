import React, { ReactElement } from "react";
import Button from "@components/button/Button";
import HassuDialog from "@components/HassuDialog";
import { DialogActions, DialogContent } from "@mui/material";

interface Props {
  dialogiOnAuki: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export default function OsapuolenPoistoDialog({ dialogiOnAuki, onClose, onAccept }: Props): ReactElement {
  const getDialogContent = () => {
    return <>Olet poistamassa suunnittelusopimuksen osapuolen tiedot. Haluatko varmasti poistaa?</>;
  };

  return (
    <HassuDialog open={dialogiOnAuki} title="Vahvista osapuolen poistaminen" onClose={onClose} maxWidth="sm">
      <DialogContent>
        <p>{getDialogContent()}</p>
      </DialogContent>
      <DialogActions>
        <Button primary type="button" id="poista-osapuoli" onClick={onAccept}>
          Poista
        </Button>
        <Button type="button" onClick={onClose}>
          Peruuta
        </Button>
      </DialogActions>
    </HassuDialog>
  );
}
