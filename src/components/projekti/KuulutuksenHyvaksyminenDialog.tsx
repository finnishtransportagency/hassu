import HassuDialog from "@components/HassuDialog";
import Button from "@components/button/Button";
import { DialogActions, DialogContent } from "@mui/material";
import { TilasiirtymaToiminto, TilasiirtymaTyyppi } from "@services/api";
import { kuntametadata } from "hassu-common/kuntametadata";
import log from "loglevel";
import useTranslation from "next-translate/useTranslation";
import React, { useCallback } from "react";
import useApi from "src/hooks/useApi";
import { useProjekti } from "src/hooks/useProjekti";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import useSnackbars from "src/hooks/useSnackbars";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import { GenericApiKuulutusJulkaisu } from "backend/src/projekti/projektiUtil";

type Props = {
  open: boolean;
  onClose: () => void;
  projekti: ProjektiLisatiedolla;
  tilasiirtymaTyyppi: TilasiirtymaTyyppi;
  isAineistoMuokkaus: boolean;
  julkaisu: GenericApiKuulutusJulkaisu;
};

export default function KuulutuksenHyvaksyminenDialog({
  open,
  onClose,
  projekti,
  tilasiirtymaTyyppi,
  isAineistoMuokkaus,
  julkaisu,
}: Props) {
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
  const isMaakuntia = julkaisu.ilmoituksenVastaanottajat?.maakunnat && julkaisu.ilmoituksenVastaanottajat.maakunnat.length > 0;
  return (
    <HassuDialog
      title={isAineistoMuokkaus ? "Aineiston hyväksyminen" : "Kuulutuksen hyväksyminen ja ilmoituksen lähettäminen"}
      hideCloseButton
      open={open}
      onClose={onClose}
      maxWidth={isAineistoMuokkaus ? "sm" : "md"}
    >
      <form style={{ display: "contents" }}>
        {isAineistoMuokkaus ? (
          <DialogContent>
            <p>
              Hyväksymällä aineiston sisällön, hyväksyt kuulutuksen aineisto päivityksen. Kuulutuspäivän jälkeen tulevat muutostarpeet
              aineistojen sisältöihin vaativat uudelleenkuuluttamisen.
            </p>
          </DialogContent>
        ) : (
          <DialogContent>
            <p>
              Olet hyväksymässä kuulutuksen ja käynnistämässä siihen liittyvän ilmoituksen automaattisen lähettämisen. Ilmoitus
              kuulutuksesta lähetetään seuraaville:
            </p>
            <div>
              <p>Viranomaiset</p>
              <ul className="vayla-dialog-list">
                {julkaisu.ilmoituksenVastaanottajat?.viranomaiset?.map((viranomainen) => (
                  <li key={viranomainen.nimi}>
                    {t(`viranomainen.${viranomainen.nimi}`)}, {viranomainen.sahkoposti}
                  </li>
                ))}
              </ul>
              <p>Kunnat</p>
              <ul className="vayla-dialog-list">
                {julkaisu.ilmoituksenVastaanottajat?.kunnat?.map((kunta) => (
                  <li key={kunta.id}>
                    {kuntametadata.nameForKuntaId(kunta.id, lang)}, {kunta.sahkoposti}
                  </li>
                ))}
              </ul>
              {isMaakuntia && (
                <>
                  <p>Maakuntaliitot</p>
                  <ul className="vayla-dialog-list">
                    {julkaisu.ilmoituksenVastaanottajat?.maakunnat?.map((maakunta) => (
                      <li key={maakunta.id}>
                        {kuntametadata.liittoNameForMaakuntaId(maakunta.id)}, {maakunta.sahkoposti}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            <p>
              Klikkaamalla Hyväksy ja lähetä -painiketta vahvistat kuulutuksen tarkastetuksi ja hyväksyt sen julkaisun kuulutuspäivänä sekä
              ilmoituksien lähettämisen. Ilmoitukset lähetetään automaattisesti painikkeen klikkaamisen jälkeen.
            </p>
            <p>
              Suunnitelman nähtäville asettamisen sekä hyväksymispäätöksen kuuluttamisen yhteydessä järjestelmä lähettää ilmoituksen osalle
              asianosaisista Tiedottaminen -sivun mukaan. Viestit lähetetään vastaanottajille kuulutuksen julkaisupäivänä.
            </p>
            <p>
              {projekti.asianhallinta.inaktiivinen
                ? "Huomaathan viedä asianhallintaan tarvittavat tiedostot itse."
                : "Järjestelmä vie tarvittavat asiakirjat automaattisesti asianhallintaan."}
            </p>
          </DialogContent>
        )}
        <DialogActions>
          <Button id="accept_kuulutus" primary type="button" onClick={hyvaksyKuulutus}>
            {isAineistoMuokkaus ? "Hyväksy" : "Hyväksy ja lähetä"}
          </Button>
          <Button type="button" onClick={onClose}>
            Peruuta
          </Button>
        </DialogActions>
      </form>
    </HassuDialog>
  );
}
