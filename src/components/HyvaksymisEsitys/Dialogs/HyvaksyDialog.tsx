import HassuDialog from "@components/HassuDialog";
import Button from "@components/button/Button";
import { DialogActions, DialogContent } from "@mui/material";
import React from "react";
import useApi from "src/hooks/useApi";
import useHyvaksymisEsitys from "src/hooks/useHyvaksymisEsitys";
import { SahkopostiVastaanottaja } from "@services/api";
import useSpinnerAndSuccessMessage from "src/hooks/useSpinnerAndSuccessMessage";

type Props = {
  open: boolean;
  onClose: () => void;
  oid: string;
  versio: number;
  vastaanottajat: SahkopostiVastaanottaja[];
};

export default function HyvaksyDialog({ open, onClose, oid, versio, vastaanottajat }: Props) {
  const api = useApi();
  const { mutate: reloadData } = useHyvaksymisEsitys();

  const hyvaksyKuulutus = useSpinnerAndSuccessMessage(async () => {
    await api.hyvaksyHyvaksymisEsitys({ oid, versio });
    onClose();
    await reloadData();
  }, "Hyväksyminen onnistui");

  return (
    <HassuDialog title={"Hyväksymisesityksen hyväksyminen"} hideCloseButton open={open} onClose={onClose} maxWidth={"sm"}>
      <form style={{ display: "contents" }}>
        <DialogContent>
          <p>Olet hyväksymässä hyväksymisesityksen seuraaville tahoille</p>

          <ul className="vayla-dialog-list">
            {vastaanottajat?.map(({ sahkoposti }) => (
              <li key={sahkoposti}>{sahkoposti}</li>
            ))}
          </ul>
          <p>Hyväksymisesitystä pystyy vapaasti päivittämään lähetyksen jälkeen.</p>
          <p>Klikkaamalla Hyväksy ja lähetä -painiketta vahvistat hyväksymisesityksen tarkistetuksi ja lähetät vastaanottajille.</p>
        </DialogContent>

        <DialogActions>
          <Button id="accept_kuulutus" primary type="button" onClick={hyvaksyKuulutus}>
            Hyväksy ja lähetä
          </Button>
          <Button type="button" onClick={onClose}>
            Peruuta
          </Button>
        </DialogActions>
      </form>
    </HassuDialog>
  );
}
