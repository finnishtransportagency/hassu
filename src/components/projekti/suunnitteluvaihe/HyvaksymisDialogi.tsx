import React, { ReactElement } from "react";
import Button from "@components/button/Button";
import HassuDialog from "@components/HassuDialog";
import useTranslation from "next-translate/useTranslation";
import { IlmoituksenVastaanottajatInput } from "@services/api";
import { DialogActions, DialogContent } from "@mui/material";
import { kuntametadata } from "../../../../common/kuntametadata";

interface Props {
  ilmoituksenVastaanottajat: IlmoituksenVastaanottajatInput | null | undefined;
  dialogiOnAuki: boolean;
  onClose: () => void;
  tallenna: (e?: React.BaseSyntheticEvent<object, any, any> | undefined) => Promise<void>;
  julkinen: boolean;
}

export default function HyvaksymisDialogi({ ilmoituksenVastaanottajat, dialogiOnAuki, onClose, tallenna, julkinen }: Props): ReactElement {
  const { t, lang } = useTranslation();

  return (
    <HassuDialog open={dialogiOnAuki} title="Vuorovaikutustietojen tallentaminen ja ilmoituksen lähettäminen" onClose={onClose}>
      <DialogContent>
        {julkinen ? (
          <p>Olet päivittämässä vuorovaikutustietoja. Ilmoitus päivitetyistä tiedoista lähetetään seuraaville:</p>
        ) : (
          <p>
            Olet tallentamassa vuorovaikutustiedot ja käynnistämässä siihen liittyvän ilmoituksen automaattisen lähettämisen. Ilmoitus
            vuorovaikutuksesta lähetetään seuraaville:
          </p>
        )}
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
          {julkinen ? (
            <p>Ilmoitukset lähetetään automaattisesti painikkeen klikkaamisen jälkeen.</p>
          ) : (
            <p>
              Klikkaamalla Hyväksy ja lähetä -painiketta vahvistat vuorovaikutustiedot tarkastetuksi ja hyväksyt sen julkaisun asetettuna
              julkaisupäivänä sekä ilmoituksien lähettämisen. Ilmoitukset lähetetään automaattisesti painikkeen klikkaamisen jälkeen.
            </p>
          )}
        </div>
      </DialogContent>
      <DialogActions>
        <Button primary type="button" id="accept_and_publish_vuorovaikutus" onClick={tallenna}>
          Hyväksy ja lähetä
        </Button>
        <Button type="button" onClick={onClose}>
          Peruuta
        </Button>
      </DialogActions>
    </HassuDialog>
  );
}
