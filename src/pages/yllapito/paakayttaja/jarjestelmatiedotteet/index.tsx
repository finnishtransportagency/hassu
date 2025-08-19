import { H1, H2 } from "@components/Headings";
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

export default function Jarjestelmatiedotteet(): ReactElement {
  const [tiedoteDialogOpen, setTiedoteDialogOpen] = useState(false);
  const [editTiedote, setEditTiedote] = useState<Tiedote | null>(null);
  const { withLoadingSpinner } = useLoadingSpinner();
  const { showErrorMessage, showSuccessMessage } = useSnackbars();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleLuoUusi = () => {
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
    [api, showErrorMessage, showSuccessMessage, withLoadingSpinner]
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
      tiedoteTyyppi: formData.tiedoteTyyppi || "YLEINEN",
      voimassaAlkaen: formData.voimassaAlkaen || formData.julkaisupaiva || new Date().toISOString(),
      voimassaPaattyen: formData.voimassaPaattyen || null,
      status: formData.status || "JULKAISTU",
    };

    return result;
  };

  return (
    <>
      <H1>Järjestelmätiedotteet</H1>
      <SectionContent>
        <p>
          Tiedotteen maksimipituus on 300 merkkiä. Jaa teksti tarvittaessa riveille. Kiinnitä huomiota tekstin selkeyteen. <br />
          Aktiivinen tarkoittaa että tiedote on näkyvillä tai ajastettu tulevaisuuteen, päivämääristä riippuen. <br /> Tiedotteita ei voi
          asettaa päällekkäisille ajankohdille, eli järjestelmä voi näyttää vain yhden tiedotteen kerrallaan. <br /> Kansalaispuolella
          näytettävien tiedotteiden teksti tulee antaa aina sekä suomeksi että ruotsiksi.
        </p>
      </SectionContent>
      <H2 style={{ paddingTop: 60, paddingBottom: 30 }}>Luo uusi tiedote</H2>
      <Button style={{ paddingLeft: 50, paddingRight: 50 }} onClick={handleLuoUusi} id="add_tiedote">
        Luo uusi tiedote
      </Button>

      <TiedoteLista onEdit={handleMuokkaa} refreshTrigger={refreshTrigger} />

      <TiedoteDialog open={tiedoteDialogOpen} onClose={handleSulje} onSubmit={handleSubmit} editTiedote={editTiedote} />
    </>
  );
}
