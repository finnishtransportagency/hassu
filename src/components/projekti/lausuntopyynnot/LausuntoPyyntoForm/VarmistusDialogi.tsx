import React, { ReactElement } from "react";
import Button from "@components/button/Button";
import HassuDialog from "@components/HassuDialog";
import { DialogActions, DialogContent } from "@mui/material";

interface Props {
  dialogiOnAuki: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export default function VarmistusDialogi({ dialogiOnAuki, onClose, onAccept }: Props): ReactElement {
  return (
    <HassuDialog open={dialogiOnAuki} title="Vahvista aineistolinkin poistaminen" onClose={onClose} maxWidth="sm">
      <DialogContent>
        <p>Olet poistamassa lausuntopyyntöaineistoon liitettävän linkin ja sen sisällön. Haluatko varmasti poistaa linkin ja sisällön?</p>
      </DialogContent>
      <DialogActions>
        <Button primary type="button" id="accept_and_publish_vuorovaikutus" onClick={onAccept}>
          Poista
        </Button>
        <Button type="button" onClick={onClose}>
          Peruuta
        </Button>
      </DialogActions>
    </HassuDialog>
  );
}
