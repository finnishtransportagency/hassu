import React, { ReactElement } from "react";
import Button from "@components/button/Button";
import HassuDialog from "@components/HassuDialog";
import { DialogActions, DialogContent } from "@mui/material";

type AineistoTyyppi = "esittelyaineistot" | "suunnitelmaluonnokset";
interface Props {
  dialogiOnAuki: boolean;
  onClose: () => void;
  onAccept: () => void;
  aineistoTyyppi?: AineistoTyyppi;
}

export default function AineistojenPoistoDialog({ dialogiOnAuki, onClose, onAccept, aineistoTyyppi }: Props): ReactElement {
  const getDialogContent = () => {
    if (aineistoTyyppi === "esittelyaineistot") {
      return (
        <>
          Olet poistamassa kaikki <strong>esittelyaineistot</strong>. Haluatko varmasti poistaa kaikki?
        </>
      );
    } else if (aineistoTyyppi === "suunnitelmaluonnokset") {
      return (
        <>
          Olet poistamassa kaikki <strong>suunnitelmaluonnokset</strong>. Haluatko varmasti poistaa kaikki?
        </>
      );
    }
    return (
      <>
        Olet poistamassa kaikki <strong>Projektivelhosta tuodut aineistot</strong>. Haluatko varmasti poistaa kaikki?
      </>
    );
  };

  return (
    <HassuDialog open={dialogiOnAuki} title="Vahvista aineistojen poistaminen" onClose={onClose} maxWidth="sm">
      <DialogContent>
        <p>{getDialogContent()}</p>
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
