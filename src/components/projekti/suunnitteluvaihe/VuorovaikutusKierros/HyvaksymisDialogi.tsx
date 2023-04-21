import React, { ReactElement } from "react";
import Button from "@components/button/Button";
import HassuDialog from "@components/HassuDialog";
import useTranslation from "next-translate/useTranslation";
import { IlmoituksenVastaanottajatInput } from "@services/api";
import { DialogActions, DialogContent } from "@mui/material";
import { kuntametadata } from "../../../../../common/kuntametadata";

interface Props {
  ilmoituksenVastaanottajat: IlmoituksenVastaanottajatInput | null | undefined;
  dialogiOnAuki: boolean;
  onClose: () => void;
  tallenna: (e?: React.BaseSyntheticEvent<object, any, any> | undefined) => Promise<void>;
}

export default function HyvaksymisDialogi({ ilmoituksenVastaanottajat, dialogiOnAuki, onClose, tallenna }: Props): ReactElement {
  const { t, lang } = useTranslation();

  return (
    <HassuDialog open={dialogiOnAuki} title="Vuorovaikutustietojen tallentaminen ja ilmoituksen lähettäminen" onClose={onClose}>
      <DialogContent>
        <p>
          Olet tallentamassa vuorovaikutuksen tietoja ja käynnistämässä siihen liittyvän kutsun ilmoituksen automaattisen lähettämisen.
          Ilmoitus kutsusta vuorovaikutukseen lähetetään seuraaville:
        </p>
        <div>
          <p>Viranomaiset</p>
          <ul className="vayla-dialog-list">
            {ilmoituksenVastaanottajat?.viranomaiset?.map((viranomainen) => (
              <li key={viranomainen.nimi}>
                {t(`common:viranomainen.${viranomainen.nimi}`)}, {viranomainen.sahkoposti}
              </li>
            ))}
          </ul>
          <p>Kunnat</p>
          <ul className="vayla-dialog-list">
            {ilmoituksenVastaanottajat?.kunnat?.map((kunta) => (
              <li key={kunta.id}>
                {kuntametadata.nameForKuntaId(kunta.id, lang)}, {kunta.sahkoposti}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p>
            Klikkaamalla Tallenna ja lähetä -painiketta vahvistat vuorovaikutustiedot tarkastetuksi ja hyväksyt sen julkaisun palvelun
            julkiselle puolelle asetettuna julkaisupäivänä sekä ilmoituksien lähettämisen. Ilmoitukset lähetetään automaattisesti painikkeen
            klikkaamisen jälkeen.
          </p>
        </div>
      </DialogContent>
      <DialogActions>
        <Button primary type="button" id="accept_and_publish_vuorovaikutus" onClick={tallenna}>
          Tallenna ja lähetä
        </Button>
        <Button type="button" onClick={onClose}>
          Peruuta
        </Button>
      </DialogActions>
    </HassuDialog>
  );
}
