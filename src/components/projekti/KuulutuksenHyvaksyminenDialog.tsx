import HassuDialog from "@components/HassuDialog";
import Button from "@components/button/Button";
import { DialogActions, DialogContent } from "@mui/material";
import { TilasiirtymaToiminto, TilasiirtymaTyyppi } from "@services/api";
import { kuntametadata } from "hassu-common/kuntametadata";
import log from "loglevel";
import useTranslation from "next-translate/useTranslation";
import React, { useCallback } from "react";
import useApi from "src/hooks/useApi";
import { ProjektiLisatiedolla, useProjekti } from "src/hooks/useProjekti";
import useSnackbars from "src/hooks/useSnackbars";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";

type Props = {
  open: boolean;
  onClose: () => void;
  projekti: ProjektiLisatiedolla;
  tilasiirtymaTyyppi: TilasiirtymaTyyppi;
};

export default function KuulutuksenHyvaksyminenDialog({ open, onClose, projekti, tilasiirtymaTyyppi }: Props) {
  const { t, lang } = useTranslation("commonFI");
  const api = useApi();
  const { mutate: reloadProjekti } = useProjekti();
  const { showSuccessMessage } = useSnackbars();

  const { withLoadingSpinner } = useLoadingSpinner();

  const hyvaksyKuulutus = useCallback(
    () =>
      withLoadingSpinner(
        (async () => {
          if (!projekti) {
            return;
          }
          try {
            await api.siirraTila({ oid: projekti.oid, toiminto: TilasiirtymaToiminto.HYVAKSY, tyyppi: tilasiirtymaTyyppi });
            await reloadProjekti();
            showSuccessMessage(`Hyväksyminen onnistui`);
          } catch (error) {
            log.error(error);
          }
          onClose();
          log.debug("hyväksy kuulutus");
        })()
      ),
    [api, onClose, projekti, reloadProjekti, showSuccessMessage, tilasiirtymaTyyppi, withLoadingSpinner]
  );

  return (
    <>
      <div>
        <HassuDialog title="Kuulutuksen hyväksyminen ja ilmoituksen lähettäminen" hideCloseButton open={open} onClose={onClose}>
          <form style={{ display: "contents" }}>
            <DialogContent>
              <p>
                Olet hyväksymässä kuulutuksen ja käynnistämässä siihen liittyvän ilmoituksen automaattisen lähettämisen. Ilmoitus
                kuulutuksesta lähetetään seuraaville:
              </p>
              <div>
                <p>Viranomaiset</p>
                <ul className="vayla-dialog-list">
                  {projekti?.aloitusKuulutus?.ilmoituksenVastaanottajat?.viranomaiset?.map((viranomainen) => (
                    <li key={viranomainen.nimi}>
                      {t(`viranomainen.${viranomainen.nimi}`)}, {viranomainen.sahkoposti}
                    </li>
                  ))}
                </ul>
                <p>Kunnat</p>
                <ul className="vayla-dialog-list">
                  {projekti?.aloitusKuulutus?.ilmoituksenVastaanottajat?.kunnat?.map((kunta) => (
                    <li key={kunta.id}>
                      {kuntametadata.nameForKuntaId(kunta.id, lang)}, {kunta.sahkoposti}
                    </li>
                  ))}
                </ul>
              </div>
              <p>
                Jos kuulutukseen pitää tehdä muutoksia hyväksymisen jälkeen, tulee kuulutus uudelleenkuuluttaa. Uudelleenkuulutuksissa ole
                yhteydessä järjestelmän pääkäyttäjään.
              </p>
              <p>
                Klikkaamalla Hyväksy ja lähetä -painiketta vahvistat kuulutuksen tarkastetuksi ja hyväksyt sen julkaisun kuulutuspäivänä
                sekä ilmoituksien lähettämisen. Ilmoitukset lähetetään automaattisesti painikkeen klikkaamisen jälkeen.
              </p>
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
      </div>
    </>
  );
}
