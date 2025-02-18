import React, { ReactElement } from "react";
import Button from "@components/button/Button";
import HassuDialog from "@components/HassuDialog";
import { DialogActions, DialogContent } from "@mui/material";

interface Props {
  dialogiOnAuki: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export default function AineistojenPoistoDialog({ dialogiOnAuki, onClose, onAccept }: Props): ReactElement {
  return (
    <HassuDialog open={dialogiOnAuki} title="Vahvista kaikkien aineistojen poistaminen" onClose={onClose} maxWidth="sm">
      <DialogContent>
        <p>Olet poistamassa kaikki Velhosta tuodut aineistot. Haluatko varmasti poistaa kaikki?</p>
      </DialogContent>
      <DialogActions>
        <Button primary type="button" id="poista-kaikki-aineistot" onClick={onAccept}>
          Poista
        </Button>
        <Button type="button" onClick={onClose}>
          Peruuta
        </Button>
      </DialogActions>
    </HassuDialog>
  );
}
