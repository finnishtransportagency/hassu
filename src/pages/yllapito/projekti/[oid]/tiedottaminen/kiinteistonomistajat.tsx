import React, { useCallback, useState, VFC, useEffect } from "react";
import { CircularProgress, Dialog, DialogActions, DialogContent, DialogProps, styled } from "@mui/material";
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
import { Omistaja, OmistajahakuTila } from "@services/api";
import useSnackbars from "src/hooks/useSnackbars";
import { GrayBackgroundText } from "../../../../../components/projekti/GrayBackgroundText";
import { useProjekti } from "src/hooks/useProjekti";
import { useProjektinTiedottaminen } from "src/hooks/useProjektinTiedottaminen";
import useApi from "src/hooks/useApi";
import { ColumnDef } from "@tanstack/react-table";
import TiedotettavaHaitari, { GetTiedotettavaFunc } from "@components/projekti/tiedottaminen/TiedotettavaHaitari";
import { OmistajienMuokkausDialog } from "../../../../../components/projekti/tiedottaminen/OmistajienMuokkausDialog";
import ButtonLink from "@components/button/ButtonLink";
import { getLocalizedCountryName } from "common/getLocalizedCountryName";

export default function Kiinteistonomistajat() {
  return (
    <ProjektiConsumer useProjektiOptions={{ revalidateOnMount: true }}>
      {(projekti) => <KiinteistonomistajatPage projekti={projekti} />}
    </ProjektiConsumer>
  );
}

const KarttaDialogi = styled(
  ({
    children,
    projekti,
    onClose,
    ...props
  }: DialogProps &
    Required<Pick<DialogProps, "onClose">> & {
      projekti: ProjektiLisatiedolla;
    }) => {
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

const readColumns: ColumnDef<Omistaja>[] = [
  {
    header: "Kiinteistötunnus",
    id: "kiinteistotunnus",
    accessorKey: "kiinteistotunnus",
    meta: {
      widthFractions: 2,
      minWidth: 160,
    },
  },
  {
    header: "Omistajan nimi",
    accessorFn: ({ etunimet, sukunimi, nimi }) => nimi ?? (etunimet && sukunimi ? `${etunimet} ${sukunimi}` : null),
    id: "omistajan_nimi",
    meta: {
      widthFractions: 3,
      minWidth: 200,
    },
  },
  {
    header: "Postiosoite",
    accessorKey: "jakeluosoite",
    id: "postiosoite",
    meta: {
      widthFractions: 3,
      minWidth: 200,
    },
  },
  {
    header: "Postinumero",
    accessorKey: "postinumero",
    id: "postinumero",
    meta: {
      widthFractions: 2,
      minWidth: 140,
    },
  },
  {
    header: "Postitoimipaikka",
    accessorFn: ({ paikkakunta, maakoodi }) => {
      // If country code is of Finland then show only paikkakunta
      if (!paikkakunta || !maakoodi || maakoodi === "FI") {
        return paikkakunta;
      }
      return [paikkakunta, getLocalizedCountryName("fi", maakoodi)].join(", ");
    },
    id: "postitoimipaikka",
    meta: {
      widthFractions: 2,
      minWidth: 180,
    },
  },
];

const KiinteistonomistajatPage: VFC<{ projekti: ProjektiLisatiedolla }> = ({ projekti }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hakuKaynnissa, setHakuKaynnissa] = useState(false);

  const { showErrorMessage } = useSnackbars();
  const { mutate } = useProjekti();
  const { data: projektinTiedottaminen } = useProjektinTiedottaminen();
  const api = useApi();

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);
  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  useEffect(() => {
    if (projektinTiedottaminen?.omistajahakuTila === OmistajahakuTila.VIRHE) {
      showErrorMessage("Omistajien haussa on tapahtunut virhe. Yritä myöhemmin uudelleen tai ota yhteys järjestelmän ylläpitäjään");
    } else if (projektinTiedottaminen?.omistajahakuTila === OmistajahakuTila.VIRHE_AIKAKATKAISU) {
      showErrorMessage("Omistajien haku aikakatkaistiin. Yritä myöhemmin uudelleen tai ota yhteys järjestelmän ylläpitäjään");
    }
    const newHakuKaynnissa = projektinTiedottaminen?.omistajahakuTila === OmistajahakuTila.KAYNNISSA;
    const hakuPaattymassa = hakuKaynnissa && !newHakuKaynnissa;
    if (hakuPaattymassa) {
      mutate();
    }
    setHakuKaynnissa(newHakuKaynnissa);
  }, [hakuKaynnissa, mutate, projektinTiedottaminen?.omistajahakuTila, showErrorMessage]);

  const [isMuokkaaDialogOpen, setIsMuokkaaDialogOpen] = useState(false);

  const openMuokkaaDialog = useCallback(() => {
    setIsMuokkaaDialogOpen(true);
  }, []);
  const closeMuokkaaDialog = useCallback(() => {
    setIsMuokkaaDialogOpen(false);
  }, []);

  const getKiinteistonOmistajatCallback = useCallback<GetTiedotettavaFunc<Omistaja>>(
    async (oid, muutOmistajat, query, from, size) => {
      const response = await api.haeKiinteistonOmistajat(oid, muutOmistajat, query, from, size);
      return { hakutulosMaara: response.hakutulosMaara, tiedotettavat: response.omistajat };
    },
    [api]
  );

  return (
    <TiedottaminenPageLayout projekti={projekti}>
      <Section>
        <ContentSpacer>
          <H2>Kuulutusten tiedottaminen</H2>
          <H3>Kiinteistönomistajien tiedot</H3>
          <p>
            Ilmoitus suunnitelman nähtäville asettamisesta ja ilmoitus hyväksymispäätöksestä toimitetaan kiinteistönomistajille järjestelmän
            kautta, kun kiinteistönomistajat on tunnistettu. Tämän sivun ilmoituksen vastaanottajalista viedään automaattisesti
            asianhallintaan kuulutuksen julkaisupäivänä. Tämä koskee myös muilla tavoin tiedotettavia kiinteistönomistajia.
          </p>
        </ContentSpacer>
        <ContentSpacer>
          <H3>Suunnitelman karttarajaus</H3>
          <p>
            Aloita kiinteistönomistajatietojen haku tuomalla karttatiedosto tai piirtämällä suunnitelman karttarajaus. Tämän jälkeen
            järjestelmä piirtää suunnitelman kartalle ja hakee kiinteistönomistajat tälle rajaukselle Maanmittauslaitoksen
            Kiinteistörekisteristä. Jos alueelle osuu paljon kiinteistönomistajia, voi haussa kestää hetki.
          </p>
          <p>Karttarajaustyökalu avautuu uuteen ikkunaan.</p>
          <Button onClick={open} type="button">
            {projekti.omistajahaku?.status ? "Muokkaa karttarajausta" : "Luo karttarajaus"}
          </Button>
          <KarttaDialogi projekti={projekti} open={isOpen} onClose={close} />
        </ContentSpacer>
      </Section>
      <Section noDivider>
        <ContentSpacer gap={7}>
          <Stack direction="row" flexWrap="wrap" alignItems="start" justifyContent="space-between">
            <H2>Kiinteistönomistajat</H2>
            <ButtonLink target="_blank" download href={`/api/projekti/${projekti.oid}/excel?kiinteisto=true`}>
              Vie exceliin
            </ButtonLink>
          </Stack>
          <GrayBackgroundText>
            <p>
              Kiinteistönomistajia on listalla yhteensä <b>{projektinTiedottaminen?.kiinteistonomistajaMaara ?? "x"} henkilöä</b>.
              Kiinteistötunnuksia on {projektinTiedottaminen?.kiinteistotunnusMaara ?? 0}.
            </p>
          </GrayBackgroundText>
          <TiedotettavaHaitari
            oid={projekti.oid}
            title="Kiinteistönomistajien tiedotus Suomi.fi -palvelulla"
            instructionText="Ilmoitus toimitetaan alle listatuille kiinteistönomistajille järjestelmän kautta kuulutuksen julkaisupäivänä. Kiinteistönomistajista viedään vastaanottajalista automaattisesti asianhallintaan, kun kuulutus julkaistaan."
            filterText="Suodata kiinteistönomistajia"
            showLessText="Näytä vähemmän kiinteistönomistajia"
            showMoreText="Näytä enemmän kiinteistönomistajia"
            columns={readColumns}
            getTiedotettavatCallback={getKiinteistonOmistajatCallback}
            muutTiedotettavat={false}
            excelDownloadHref={`/api/projekti/${projekti.oid}/excel?kiinteisto=true&suomifi=true`}
          />
          <TiedotettavaHaitari
            oid={projekti.oid}
            title="Kiinteistönomistajien tiedotus muilla tavoin"
            instructionText="Huomaathan, että kaikkien kiinteistönomistajien tietoja ei ole mahdollista löytää järjestelmän kautta. Tällöin tieto kuulutuksesta toimitetaan kiinteistönomistajalle järjestelmän ulkopuolella. Voit listata alle kiinteistönomistajien osoitteen muistiin. Lähetä kaikille tässä listassa oleville kiinteistönomistajille ilmoitus kuulutuksesta postitse. Kiinteistönomistajista viedään vastaanottajalista automaattisesti asianhallintaan, kun kuulutus hyväksytään julkaistavaksi."
            filterText="Suodata kiinteistönomistajia"
            showLessText="Näytä vähemmän kiinteistönomistajia"
            showMoreText="Näytä enemmän kiinteistönomistajia"
            columns={readColumns}
            getTiedotettavatCallback={getKiinteistonOmistajatCallback}
            muutTiedotettavat={true}
            excelDownloadHref={`/api/projekti/${projekti.oid}/excel?kiinteisto=true&suomifi=false`}
          />
          <MuokkaaButton primary type="button" onClick={openMuokkaaDialog}>
            Muokkaa
          </MuokkaaButton>
          <OmistajienMuokkausDialog
            isOpen={isMuokkaaDialogOpen}
            close={closeMuokkaaDialog}
            oid={projekti.oid}
            projektinimi={projekti.velho.nimi}
          />
        </ContentSpacer>
      </Section>
      <HassuDialog
        open={hakuKaynnissa}
        title="Haetaan kiinteistönomistajia"
        maxWidth="sm"
        hideCloseButton
        contentAsideTitle={<CircularProgress />}
      >
        <DialogContent>
          <p>Tietojen hakuaika kiinteistöjen osalta vaihtelee kartan alueen laajuuden mukaan. Älä sulje selainta tai selainikkunaa.</p>
          <p>Haettavien kiinteistöjen määrä {projektinTiedottaminen?.kiinteistotunnusMaara ?? 0} kpl.</p>
        </DialogContent>
      </HassuDialog>
    </TiedottaminenPageLayout>
  );
};

const MuokkaaButton = styled(Button)({ marginLeft: "auto" });
