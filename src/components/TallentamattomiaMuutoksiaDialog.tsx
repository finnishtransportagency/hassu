import { DialogActions, DialogContent } from "@mui/material";
import React, { FC } from "react";
import Button from "./button/Button";
import HassuDialog from "./HassuDialog";
import HassuStack from "./layout/HassuStack";

const TallentamattomiaMuutoksiaDialog: FC<{ open: boolean; handleClickClose: () => void; handleClickOk: () => void }> = ({
  open,
  handleClickClose,
  handleClickOk,
}) => {
  return (
    <HassuDialog title="Tallentamattomia muutoksia" open={open} onClose={handleClickClose}>
      <DialogContent>
        <HassuStack>
          <p>
            Olet tehnyt sivulle muutoksia, joita ei ole tallennettu. Tehdyt muutokset menetetään, jos poistut sivulta. Haluatko poistua
            tallentamatta?
          </p>
        </HassuStack>
      </DialogContent>
      <DialogActions>
        <Button primary onClick={handleClickOk}>
          Hylkää muutokset ja siirry
        </Button>
        <Button onClick={handleClickClose}>Peruuta</Button>
      </DialogActions>
    </HassuDialog>
  );
};

export default TallentamattomiaMuutoksiaDialog;
