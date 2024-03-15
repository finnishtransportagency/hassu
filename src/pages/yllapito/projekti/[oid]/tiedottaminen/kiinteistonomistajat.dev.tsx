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
import { yupResolver } from "@hookform/resolvers/yup";
import { UseFormProps, useForm, SubmitHandler, FormProvider } from "react-hook-form";
import { kiinteistonOmistajatSchema } from "src/schemas/kiinteistonOmistajat";
import { OmistajatLomakeOsio } from "@components/projekti/tiedottaminen/OmistajatLomakeOsio";

export default function Kiinteistonomistajat() {
  return (
    <ProjektiConsumer useProjektiOptions={{ revalidateOnMount: true }}>
      {(projekti) => <KiinteistonomistajatPage projekti={projekti} />}
    </ProjektiConsumer>
  );
}

export type OmistajaRow = Omistaja & { toBeDeleted: boolean; rowIndex: number };

export type FormData = {
  oid: string;
  muutOmistajatQuery: string;
  suomifiOmistajatQuery: string;
  suomifiOmistajat: OmistajaRow[];
  muutOmistajat: OmistajaRow[];
};

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

export const PAGE_SIZE = 25;

const getFormDefaultValues: (oid: string) => FormData = (oid) => ({
  oid,
  muutOmistajat: [],
  suomifiOmistajat: [],
  muutOmistajatQuery: "",
  suomifiOmistajatQuery: "",
});

const formOptions: (oid: string) => UseFormProps<FormData> = (oid) => ({
  resolver: yupResolver(kiinteistonOmistajatSchema, { abortEarly: false, recursive: true }),
  mode: "onChange",
  reValidateMode: "onChange",
  defaultValues: getFormDefaultValues(oid),
  shouldUnregister: false,
});

const KiinteistonomistajatPage: VFC<{ projekti: ProjektiLisatiedolla }> = ({ projekti }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hakuKaynnissa, setHakuKaynnissa] = useState(false);

  const [suomifiExpanded, setSuomifiExpanded] = useState(false);

  const [muutExpanded, setMuutExpanded] = useState(false);

  const { showErrorMessage } = useSnackbars();
  const { mutate } = useProjekti();
  const { data: projektinTiedottaminen } = useProjektinTiedottaminen();

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
    const hakuAlkamassa = !hakuKaynnissa && newHakuKaynnissa;
    if (hakuPaattymassa) {
      mutate();
    }
    if (hakuAlkamassa) {
      setMuutExpanded(false);
      setSuomifiExpanded(false);
    }
    setHakuKaynnissa(newHakuKaynnissa);
  }, [hakuKaynnissa, mutate, projektinTiedottaminen?.omistajahakuTila, showErrorMessage]);

  const useFormReturn = useForm<FormData>(formOptions(projekti.oid));

  const onSubmit = useCallback<SubmitHandler<FormData>>((data) => {
    console.log(data);
    // withLoadingSpinner((async () => await api.tallennaKiinteistonOmistajat(data))());
  }, []);

  return (
    <TiedottaminenPageLayout projekti={projekti}>
      <Section>
        <ContentSpacer>
          <H2>Kiinteistönomistajien tiedot</H2>
          <p>
            Kuulutus suunnitelman nähtäville asettamisesta ja kuulutus hyväksymispäätöksestä toimitetaan kiinteistönomistajille järjestelmän
            kautta kun kiinteistönomistajat on tunnistettu. Tämän sivun kuulutuksen vastaanottajalista viedään automaattisesti
            asianhallintaan kuulutuksen julkaisupäivänä. Tämä koskee muilla tavoin tiedotettavia kiinteistönomistajia.
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
        <GrayBackgroundText>
          <p>
            Listalla on yhteensä <b>{projektinTiedottaminen?.kiinteistonomistajaMaara ?? "x"} kiinteistönomistaja(a)</b>.
            Kiinteistötunnuksia on {projektinTiedottaminen?.kiinteistotunnusMaara ?? 0}.
          </p>
        </GrayBackgroundText>
        <FormProvider {...useFormReturn}>
          <Form>
            <OmistajatLomakeOsio
              oid={projekti.oid}
              expanded={suomifiExpanded}
              setExpanded={setSuomifiExpanded}
              title="Kiinteistönomistajien tiedotus Suomi.fi -palvelulla"
              instructionText="Kuulutus toimitetaan alle listatuille kiinteistönomistajille järjestelmän kautta kuulutuksen julkaisupäivänä. Kiinteistönomistajista viedään vastaanottajalista automaattisesti asianhallintaan, kun kuulutus julkaistaan."
              fieldArrayName="suomifiOmistajat"
              queryFieldName="suomifiOmistajatQuery"
            />
            <OmistajatLomakeOsio
              oid={projekti.oid}
              expanded={muutExpanded}
              setExpanded={setMuutExpanded}
              title="Kiinteistönomistajien tiedotus muilla tavoin"
              instructionText={
                <>
                  Huomaathan, että kaikkien kiinteistönomistajien tietoja ei ole mahdollista löytää järjestelmän kautta. Tälläisiä ovat{" "}
                  <span style={{ color: "#C73F01" }}>x, z, y</span> jolloin tieto kuulutuksesta toimitetaan kiinteistönomistajalle
                  järjestelmän ulkopuolella. Voit listata alle kiinteistönomistajien osoitteet muistiin ja lähettää heille kuulutuksen
                  postiosoitteisiin. Kiinteistönomistajista viedään vastaanottajalista asianhallintaan, kun kuulutus julkaistaan.
                </>
              }
              fieldArrayName="muutOmistajat"
              queryFieldName="muutOmistajatQuery"
              muutOmistajat
            />
            <TallennaButton primary type="button" onClick={useFormReturn.handleSubmit(onSubmit)}>
              Tallenna
            </TallennaButton>
          </Form>
        </FormProvider>
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

const Form = styled("form")({ display: "contents" });
const TallennaButton = styled(Button)({ marginLeft: "auto" });
