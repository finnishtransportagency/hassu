import { Dispatch, ReactElement, SetStateAction } from "react";
import { DialogActions, DialogContent } from "@mui/material";
import Button from "@components/button/Button";
import HassuDialog from "@components/HassuDialog";

type Props = {
  openPoistoDialogi: boolean;
  setOpenPoistoDialogi: Dispatch<SetStateAction<boolean>>;
  poistaKierros: () => void;
};

export default function KierroksenPoistoDialog({ openPoistoDialogi, setOpenPoistoDialogi, poistaKierros }: Props): ReactElement {
  return (
    <HassuDialog open={openPoistoDialogi} title="Poista luonnos" onClose={() => setOpenPoistoDialogi(false)}>
      <form style={{ display: "contents" }}>
        <DialogContent>
          <p>Olet tehnyt sivulle muutoksia. Tehdyt muutokset menetetään, jos poistat kutsun luonnoksen. Haluatko poistaa luonnoksen?</p>
        </DialogContent>
        <DialogActions>
          <Button
            primary
            id="accept_publish"
            onClick={(e) => {
              e.preventDefault();
              poistaKierros();
            }}
          >
            Poista luonnos
          </Button>
          <Button
            id="cancel_publish"
            onClick={(e) => {
              setOpenPoistoDialogi(false);
              e.preventDefault();
            }}
          >
            Peruuta
          </Button>
        </DialogActions>
      </form>
    </HassuDialog>
  );
}
