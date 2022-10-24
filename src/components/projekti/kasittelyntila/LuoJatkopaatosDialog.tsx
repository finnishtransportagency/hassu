import React from "react";
import Button from "@components/button/Button";
import { DialogActions, DialogContent } from "@mui/material";
import HassuDialog from "@components/HassuDialog";
import useTranslation from "next-translate/useTranslation";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tallenna: (e?: React.BaseSyntheticEvent<object, any, any> | undefined) => Promise<void>;
}

export default function LuoJatkopaatosDialog({ isOpen, onClose, tallenna }: Props) {
  const { t } = useTranslation();

  return (
    <HassuDialog open={isOpen} title={t("projekti:kasittelyn_tila.luo-jatkopaatos")} onClose={onClose}>
      <DialogContent>
        <div>
          <p>{t("projekti:kasittelyn_tila.jatkopaatosohjeet")}</p>
          <p>{t("projekti:kasittelyn_tila.jatkopaatosohjeet-paivita-projektipaallikko")}</p>
        </div>
      </DialogContent>
      <DialogActions>
        <Button primary type="button" id="accept_and_save_jatkopaatos" onClick={tallenna}>
          Tallenna ja luo jatkopäätös
        </Button>
        <Button type="button" onClick={onClose}>
          Peruuta
        </Button>
      </DialogActions>
    </HassuDialog>
  );
}
