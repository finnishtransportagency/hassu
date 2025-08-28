import { H1, H2, H3 } from "@components/Headings";
import SectionContent from "@components/layout/SectionContent";
import React, { ReactElement, useCallback, useState } from "react";
import Button from "@components/button/Button";
import TiedoteLista from "@components/paakayttaja/TiedoteLista";
import TiedoteDialog from "@components/paakayttaja/TiedoteDialog";
import { Tiedote, TiedoteInput } from "common/graphql/apiModel";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import { v4 as uuidv4 } from "uuid";
import log from "loglevel";
import useSnackbars from "src/hooks/useSnackbars";
import { api } from "@services/api";
import Notification, { NotificationType } from "@components/notification/Notification";
import { DottedList } from "@components/notification/DottedList";
import TiedotteenVahvistusDialog from "@components/projekti/common/TiedotteenVahvistusDialog";

export default function Jarjestelmatiedotteet(): ReactElement {
  const [tiedoteDialogOpen, setTiedoteDialogOpen] = useState(false);
  const [tiedotteet, setTiedotteet] = useState<Tiedote[]>([]);
  const [editTiedote, setEditTiedote] = useState<Tiedote | null>(null);
  const { withLoadingSpinner } = useLoadingSpinner();
  const { showErrorMessage, showSuccessMessage } = useSnackbars();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [vahvistusDialogiAuki, setVahvistusDialogiAuki] = useState(false);
  const [odottavaToiminto, setOdottavaToiminto] = useState<{
    tyyppi: "tallennus" | "poisto";
    data?: any;
    callback: () => void;
  } | null>(null);

  const handleLuoUusi = () => {
    if (tiedotteet.length >= 10) {
      showErrorMessage("Maksimimäärä (10) tiedotteita on jo luotu. Poista ensin vanhoja tiedotteita tai muokkaa olemassaolevia.");
      return;
    }
    setEditTiedote(null);
    setTiedoteDialogOpen(true);
  };

  const handleMuokkaa = (tiedote: Tiedote) => {
    setEditTiedote(tiedote);
    setTiedoteDialogOpen(true);
  };

  const handleSulje = () => {
    setEditTiedote(null);
    setTiedoteDialogOpen(false);
  };

  const handleSubmit = useCallback(
    async (tiedoteData: any) => {
      withLoadingSpinner(
        (async () => {
          let tiedoteInput: TiedoteInput | undefined = undefined;

          try {
            tiedoteInput = mapTiedoteFormDataForApi(tiedoteData);
          } catch (error) {
            log.error("Virhe tiedotteen tietojen muuttamisessa tallennettavaan muotoon \n", error, tiedoteData);
            showErrorMessage("Tiedotteen tietoja ei pystytty muuttamaan tallennettavaan muotoon");
            return;
          }

          if (tiedoteInput) {
            try {
              await api.tallennaTiedote(tiedoteInput);
              setRefreshTrigger((prev) => prev + 1);
              setEditTiedote(null);
              setTiedoteDialogOpen(false);
              showSuccessMessage("Tiedote tallennettu");
            } catch (error) {
              log.error("Virhe tiedotetietojen tallennuksessa: \n", error, tiedoteInput);
              showErrorMessage("Tiedotteen tallennus epäonnistui");
            }
          }
        })()
      );
    },
    [showErrorMessage, showSuccessMessage, withLoadingSpinner]
  );

  const mapTiedoteFormDataForApi = (formData: any): TiedoteInput => {
    const tiedoteId = formData.id || uuidv4();

    const result: TiedoteInput = {
      id: tiedoteId,
      aktiivinen: formData.aktiivinen !== undefined ? formData.aktiivinen : true,
      kenelleNaytetaan: formData.kenelleNaytetaan || [],
      otsikko: formData.otsikko || "",
      tiedoteFI: formData.sisalto || formData.tiedoteFI || "",
      tiedoteSV: formData.tiedoteSV || null,
      tiedoteTyyppi: formData.tiedoteTyyppi || "INFO",
      voimassaAlkaen: formData.voimassaAlkaen || new Date().toISOString(),
      voimassaPaattyen: formData.voimassaPaattyen || null,
      muokattu: new Date().toISOString(),
    };

    return result;
  };

  const handleDelete = useCallback(
    async (tiedoteId: string) => {
      withLoadingSpinner(
        (async () => {
          try {
            await api.tallennaTiedote(undefined, [tiedoteId]);
            setRefreshTrigger((prev) => prev + 1);
            setTiedoteDialogOpen(false);
            showSuccessMessage("Tiedote poistettu");
          } catch (error) {
            console.error("Virhe tiedotteen poistossa:", error);
            showErrorMessage("Tiedotteen poisto epäonnistui");
          }
        })()
      );
    },
    [showSuccessMessage, showErrorMessage, withLoadingSpinner]
  );

  const avaaVahvistus = (action: "tallennus" | "poisto", data: any, callback: () => void) => {
    setOdottavaToiminto({ tyyppi: action, data, callback });
    setVahvistusDialogiAuki(true);
  };

  const vahvistaToiminto = () => {
    if (odottavaToiminto) {
      odottavaToiminto.callback();
    }
    setVahvistusDialogiAuki(false);
    setOdottavaToiminto(null);
  };

  const peruutaToiminto = () => {
    setVahvistusDialogiAuki(false);
    setOdottavaToiminto(null);
  };

  return (
    <>
      <H1>Järjestelmätiedotteet</H1>
      <SectionContent>
        <Notification closable type={NotificationType.INFO}>
          <div>
            <H3 variant="h4">Ohjeet</H3>
            <DottedList className="list-disc block pl-5">
              <li>Tällä sivulla voit luoda järjestelmän virkamies- ja/tai julkisella puolella näkyvän häiriötiedotteen. </li>
              <li>Tiedotteen tyyppi voi olla info (esim. tuleva katko) tai varoitus (esim. käynnissä oleva ennakoimaton häiriö). </li>
              <li>
                Järjestelmä voi näyttää vain yhtä tiedotetta kerrallaan. Jos tiedotteita olisi useampi pitää valita mikä näytetään
                järjestelmässä, priorisoi varoitukset.
              </li>
              <li>Aktiivinen tarkoittaa, että tiedote on näkyvillä tai ajastettu julkaistavaksi.</li>
              <li>Voit luoda tiedotteesta luonnoksen jättämällä sen tilan ei aktiiviseksi. </li>
              <li>
                Uutta tiedotetta luodessa aseta ajankohta, jolloin tiedote on aktiivinen eli nähtävillä, näkyykö se virkamies- ja/tai
                julkisella puolella, tiedotteen tyyppi sekä kirjoita tiedotteen teksti.{" "}
              </li>
              <li>
                Kiinnitäthän huomiota tekstin selkeyteen. Voit kirjoittaa tekstin itse tai hyödyntää valmiita tekstipohjia (suomi ja ruotsi)
                (linkki){" "}
              </li>
              <li>Tiedotteita voi olla kerrallaan tallennettuna korkeintaan 10 kpl.</li>
              <li>Tiedotteen maksimipituus on 300 merkkiä. Tekstin voi jakaa eri riveille. </li>
              <li>Palvelun julkisella puolella julkaistavan häiriötiedotteen tulee aina olla sekä suomeksi että ruotsiksi. </li>
              <li>Näkyvillä olevan tiedotteen saa pois näkyviltä muuttamalla sen tilan ei aktiiviseksi.</li>
            </DottedList>
          </div>
        </Notification>
      </SectionContent>
      <H2 style={{ paddingTop: 60, paddingBottom: 30 }}>Luo uusi tiedote</H2>
      <Button style={{ paddingLeft: 50, paddingRight: 50 }} onClick={handleLuoUusi} id="add_tiedote">
        Luo uusi tiedote
      </Button>

      <TiedoteLista onEdit={handleMuokkaa} refreshTrigger={refreshTrigger} tiedotteet={tiedotteet} setTiedotteet={setTiedotteet} />

      <TiedoteDialog
        open={tiedoteDialogOpen}
        onClose={handleSulje}
        onSubmit={(data) => avaaVahvistus("tallennus", data, () => handleSubmit(data))}
        editTiedote={editTiedote}
        onDelete={(tiedote) => avaaVahvistus("poisto", tiedote, () => handleDelete(tiedote.id))}
        tiedotteet={tiedotteet}
      />
      <div>
        {vahvistusDialogiAuki && odottavaToiminto && (
          <TiedotteenVahvistusDialog
            open={vahvistusDialogiAuki}
            onClose={peruutaToiminto}
            onAccept={vahvistaToiminto}
            toiminto={odottavaToiminto?.tyyppi === "poisto" ? "poisto" : "tallennus"}
            tiedote={odottavaToiminto?.data}
          />
        )}
      </div>
    </>
  );
}
