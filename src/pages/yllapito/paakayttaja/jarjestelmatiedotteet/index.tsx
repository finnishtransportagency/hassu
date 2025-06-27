import { H1, H2 } from "@components/Headings";
import SectionContent from "@components/layout/SectionContent";
import React, { ReactElement, useState } from "react";
import Button from "@components/button/Button";
import TiedoteLista from "@components/paakayttaja/TiedoteLista";
import TiedoteDialog from "@components/paakayttaja/TiedoteDialog";
import { Tiedote } from "common/graphql/apiModel";

export default function Jarjestelmatiedotteet(): ReactElement {
  const [tiedoteDialogOpen, setTiedoteDialogOpen] = useState(false);
  const [editTiedote, setEditTiedote] = useState<Tiedote | null>(null);
  // kesken
  // const { data, loading, error, refetch } = useQuery(LISTAA_TIEDOTTEET);
  // const [tallennaTiedote] = useMutation(TALLENNA_TIEDOTE);

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

  const handleSubmit = () => {
    setEditTiedote(null);
    setTiedoteDialogOpen(false);
  };

  //const tiedotteet = data?.listaaTiedotteet || [];

  // const handleSubmit = async (tiedoteData: any) => {
  //   try {
  //     const tiedoteId = tiedoteData.id || uuidv4();

  //     await tallennaTiedote({
  //       variables: {
  //         id: tiedoteId,
  //         tiedotteet: [{ ...tiedoteData, id: tiedoteId }],
  //         poistettavatTiedotteet: [],
  //       },
  //     });

  //     refetch();
  //     setEditTiedote(null);
  //     setTiedoteDialogOpen(false);
  //   } catch (error) {
  //     console.error("Tallennus epäonnistui:", error);
  //   }
  // };

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

      <TiedoteLista onEdit={handleMuokkaa} />

      <TiedoteDialog open={tiedoteDialogOpen} onClose={handleSulje} onSubmit={handleSubmit} editTiedote={editTiedote} />
    </>
  );
}
