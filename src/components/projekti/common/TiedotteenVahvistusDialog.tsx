import React, { ReactElement } from "react";
import Button from "@components/button/Button";
import HassuDialog from "@components/HassuDialog";
import { DialogActions, DialogContent } from "@mui/material";

interface Props {
  open: boolean;
  onClose: () => void;
  onAccept: () => void;
  toiminto: "tallennus" | "poisto";
  tiedote: {
    aktiivinen: boolean;
    voimassaAlkaen: string;
    voimassaPaattyen?: string;
  };
}

export default function TiedotteenVahvistusDialog({ open, onClose, onAccept, toiminto, tiedote }: Props): ReactElement {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fi-FI");
  };

  const getDialogContent = () => {
    if (toiminto === "poisto") {
      return `Olet poistamassa tiedotetta. Haluatko varmasti poistaa tiedotteen kokonaan?`;
    }

    if (!tiedote?.voimassaAlkaen) {
      return "Tiedotteen voimassaolotiedot puuttuvat.";
    }

    const alkaaDate = new Date(tiedote.voimassaAlkaen);
    const nyt = new Date();
    const paattyyDate = tiedote.voimassaPaattyen ? new Date(tiedote.voimassaPaattyen) : null;

    if (tiedote.aktiivinen && alkaaDate > nyt) {
      const paattyyTeksti = paattyyDate ? ` - ${formatDate(tiedote.voimassaPaattyen!)}` : "-";
      return `Olet ajastamassa tiedotetta. Tiedote ajastetaan aikavälille ${formatDate(tiedote.voimassaAlkaen)}${paattyyTeksti}.`;
    } else if (tiedote.aktiivinen) {
      const paattyyTeksti = paattyyDate ? ` ja se on näkyvillä ${formatDate(tiedote.voimassaPaattyen!)} asti` : "";
      return `Olet julkaisemassa tiedotetta. Tiedote asetetaan heti näkyville${paattyyTeksti}.`;
    } else {
      return "Tiedote tallentuu luonnoksena. Kun haluat tiedotteen näkyviin, määritä voimassaoloajat ja aseta tiedote aktiiviseksi.";
    }
  };

  const getButtonText = () => {
    if (toiminto === "poisto") return "Poista";
    if (!tiedote?.aktiivinen) return "Tallenna luonnos";
    const alkaaDate = new Date(tiedote.voimassaAlkaen);
    const nyt = new Date();
    return alkaaDate > nyt ? "Ajasta" : "Julkaise";
  };

  return (
    <HassuDialog open={open} title="Vahvista toiminto" onClose={onClose} maxWidth="sm">
      <DialogContent>
        <p>{getDialogContent()}</p>
      </DialogContent>
      <DialogActions>
        <Button primary type="button" id="vahvista" onClick={onAccept}>
          {getButtonText()}
        </Button>
        <Button type="button" onClick={onClose}>
          Peruuta
        </Button>
      </DialogActions>
    </HassuDialog>
  );
}
