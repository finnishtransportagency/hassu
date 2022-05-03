// import { useFormContext } from "react-hook-form";
import SectionContent from "@components/layout/SectionContent";
import Section from "@components/layout/Section";
import { useState } from "react";
import Button from "@components/button/Button";
import TextInput from "@components/form/TextInput";
import Notification, { NotificationType } from "@components/notification/Notification";
import HassuDialog from "@components/HassuDialog";
import HassuGrid from "@components/HassuGrid";
import HassuGridItem from "@components/HassuGridItem";
import { Stack } from "@mui/material";

export default function LuonnoksetJaAineistot() {
  const [aineistoDialogOpen, setAineistoDialogOpen] = useState(false);
  const openAineistoDialog = () => setAineistoDialogOpen(true);
  const closeAineistoDialog = () => setAineistoDialogOpen(false);
  // const context = useFormContext();

  return (
    <Section>
      <SectionContent>
        <h4 className="vayla-small-title">Suunnitelmaluonnokset ja esittelyaineistot</h4>
        <p>
          Esittelyvideo tulee olla ladattuna erilliseen videojulkaisupalveluun (esim. Youtube) ja videon katselulinkki
          tuodaan sille tarkoitettuun kenttään. Luonnokset ja muut materiaalit tuodaan Projektivelhosta.
          Suunnitelmaluonnokset ja esittelyaineistot on mahdollista. Suunnitelmaluonnokset ja aineistot julkaistaan
          palvelun julkisella puolella vuorovaikutuksen julkaisupäivänä.{" "}
        </p>
        <Notification type={NotificationType.INFO_GRAY}>
          Huomioithan, että suunnitelmaluonnoksien ja esittelyaineistojen tulee täyttää saavutettavuusvaatimukset.{" "}
        </Notification>
      </SectionContent>
      <SectionContent>
        <h5 className="vayla-smallest-title">Suunnitelmaluonnokset ja esittelyaineistot</h5>
        <Button type="button" disabled onClick={openAineistoDialog}>
          Tuo Aineistoja
        </Button>
        <HassuDialog
          title="Aineistojen valitseminen"
          showCloseButton
          open={aineistoDialogOpen}
          onClose={closeAineistoDialog}
          maxWidth="lg"
        >
          <SectionContent largeGaps>
            <p>
              Näet alla Projektivelhoon tehdyt toimeksiannot ja toimeksiantoihin ladatut tiedostot. Valitse tiedostot,
              jotka haluat tuoda suunnitteluvaiheeseen.{" "}
            </p>
            <HassuGrid cols={{ xs: 1, lg: 3 }} sx={{ columnGap: 0 }}>
              <HassuGridItem colSpan={{ lg: 2 }}>
                <h5 className="vayla-smallest-title">Vuorovaikutustilaisuus</h5>
                <h5 className="vayla-smallest-title">Nähtävilläolo</h5>
                <h5 className="vayla-smallest-title">Hyväksymispäätös</h5>
              </HassuGridItem>
              <HassuGridItem
                sx={{ borderLeft: { lg: "solid 1px #999990" }, paddingLeft: { lg: 7.5 }, marginLeft: { lg: 7.5 } }}
              >
                <h5 className="vayla-smallest-title">Valitut tiedostot</h5>
              </HassuGridItem>
            </HassuGrid>
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="flex-end">
              <Button primary type="button" onClick={closeAineistoDialog}>
                Tuo valitut aineistot
              </Button>
              <Button type="button" onClick={closeAineistoDialog}>
                Peruuta
              </Button>
            </Stack>
          </SectionContent>
        </HassuDialog>
      </SectionContent>
      <SectionContent>
        <h5 className="vayla-smallest-title">Ennalta kuvattu videoesittely</h5>
        <TextInput label="Linkki videoon" disabled />
      </SectionContent>
      <Button disabled>Lisää uusi +</Button>
      <SectionContent>
        <h5 className="vayla-smallest-title">Muut esittelymateriaalit</h5>
        <p>
          Muu esittelymateraali on järjestelmän ulkopuolelle julkaistua suunnitelmaan liittyvää materiaalia. Muun
          esittelymateriaalin lisääminen on vapaaehtoista.{" "}
        </p>
        <TextInput label="Linkin kuvaus" disabled />
        <TextInput label="Linkki muihin esittelyaineistoihin" disabled />
      </SectionContent>
    </Section>
  );
}
