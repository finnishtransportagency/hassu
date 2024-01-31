import React, { useCallback, useState } from "react";
import { Dialog, DialogActions, DialogContent, DialogProps, styled } from "@mui/material";
import { StyledMap } from "@components/projekti/common/StyledMap";
import { ProjektiLisatiedolla } from "common/ProjektiValidationContext";
import ProjektiConsumer from "@components/projekti/ProjektiConsumer";
import Button from "@components/button/Button";
import HassuDialog from "@components/HassuDialog";
import Section from "@components/layout/Section2";
import { TiedottaminenPageLayout } from "@components/projekti/tiedottaminen/TiedottaminenPageLayout";
import { H2, H3 } from "@components/Headings";
import ContentSpacer from "@components/layout/ContentSpacer";
import { Stack } from "@mui/system";
import KiinteistonomistajaTable from "@components/projekti/tiedottaminen/KiinteistonomistajaTable";

export default function Kiinteistonomistajat() {
  const [isOpen, setIsOpen] = useState(false);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);
  const open = useCallback(() => {
    setIsOpen(true);
  }, []);
  return (
    <ProjektiConsumer useProjektiOptions={{ revalidateOnMount: true }}>
      {(projekti) => (
        <>
          <TiedottaminenPageLayout projekti={projekti}>
            <Section>
              <ContentSpacer>
                <H2>Kiinteistönomistajien tiedot</H2>
                <p>
                  Kuulutus suunnitelman nähtäville asettamisesta ja kuulutus hyväksymispäätöksestä toimitetaan kiinteistönomistajille
                  järjestelmän kautta kun kiinteistönomistajat on tunnistettu. Tämän sivun kuulutuksen vastaanottajalista viedään
                  automaattisesti asianhallintaan kuulutuksen julkaisupäivänä. Tämä koskee muilla tavoin tiedotettavia kiinteistönomistajia.
                </p>
              </ContentSpacer>
              <ContentSpacer>
                <H3>Suunnitelman karttatiedosto ja karttarajaus</H3>
                <p>
                  Aloita kiinteistönomistajatietojen haku tuomalla karttatiedosto tai piirtämällä suunnitelman karttarajaus. Tämän jälkeen
                  järjestelmä piirtää suunnitelman kartalle ja etsii kiinteistönomistajat tälle rajaukselle. Jos alueelle osuu paljon
                  kiinteistönomistajia, voi haussa kestää hetki.
                </p>
                <p>****KARTTA TÄHÄN****</p>
                <Button onClick={open} type="button">
                  Luo karttarajaus
                </Button>
                <KarttaDialogi projekti={projekti} open={isOpen} onClose={close} />
              </ContentSpacer>
            </Section>
            <Section>
              <Stack direction="row" flexWrap="wrap" justifyContent="space-between">
                <H2>Kiinteistönomistajat</H2>
                <Button disabled>Vie exceliin</Button>
              </Stack>
              <KiinteistonomistajaTable
                oid={projekti.oid}
                title="Kiinteistönomistajien tiedotus Suomi.fi -palvelulla"
                instructionText="Kuulutus toimitetaan alle listatuille kiinteistönomistajille järjestelmän kautta kuulutuksen julkaisupäivänä. Kiinteistönomistajista viedään vastaanottajalista automaattisesti asianhallintaan, kun kuulutus julkaistaan."
              />
              <KiinteistonomistajaTable
                oid={projekti.oid}
                title="Kiinteistönomistajien tiedotus muilla tavoin"
                instructionText={
                  <>
                    Huomaathan, että kaikkien kiinteistönomistajien tietoja ei ole mahdollista löytää järjestelmän kautta. Tälläisiä ovat{" "}
                    <span style={{ color: "#C73F01" }}>x, z, y</span> jolloin tieto kuulutuksesta toimitetaan kiinteistönomistajalle
                    järjestelmän ulkopuolella. Voit listata alle kiinteistönomistajien osoitteet muistiin ja lähettää heille kuulutuksen
                    postiosoitteisiin. Kiinteistönomistajista viedään vastaanottajalista asianhallintaan, kun kuulutus julkaistaan.
                  </>
                }
                muutOmistajat
              />
            </Section>
          </TiedottaminenPageLayout>
        </>
      )}
    </ProjektiConsumer>
  );
}

const KarttaDialogi = styled(
  ({
    children,
    projekti,
    onClose,
    ...props
  }: DialogProps & Required<Pick<DialogProps, "onClose">> & { projekti: ProjektiLisatiedolla }) => {
    const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
    const closeConfirmation = useCallback(() => {
      setIsConfirmationOpen(false);
    }, []);

    const closeMainDialog = useCallback(() => {
      onClose({}, "backdropClick");
    }, [onClose]);

    const closeAll = useCallback(() => {
      closeConfirmation();
      closeMainDialog();
    }, [closeConfirmation, closeMainDialog]);

    const handleMainDialogOnClose = useCallback(
      (isMapEdited: boolean) => {
        if (isMapEdited) {
          setIsConfirmationOpen(true);
        } else {
          closeAll();
        }
      },
      [closeAll]
    );

    return (
      <>
        <Dialog fullScreen onClose={handleMainDialogOnClose} {...props}>
          <StyledMap projekti={projekti} closeDialog={handleMainDialogOnClose}>
            {children}
          </StyledMap>
        </Dialog>
        <HassuDialog maxWidth="sm" open={isConfirmationOpen} title="Poistu karttatyökalusta" onClose={closeConfirmation}>
          <DialogContent>
            <p>Rajausta ei ole tallennettu. Listaa kiinteistöistä ei haeta.</p>
          </DialogContent>
          <DialogActions>
            <Button type="button" primary onClick={closeAll}>
              Poistu
            </Button>
            <Button type="button" onClick={closeConfirmation}>
              Peruuta
            </Button>
          </DialogActions>
        </HassuDialog>
      </>
    );
  }
)({});
