import React, { useCallback, useState, VFC, useEffect } from "react";
import { Checkbox, CircularProgress, Dialog, DialogActions, DialogContent, DialogProps, styled } from "@mui/material";
import { StyledMap } from "@components/projekti/common/StyledMap";
import { ProjektiLisatiedolla } from "common/ProjektiValidationContext";
import ProjektiConsumer from "@components/projekti/ProjektiConsumer";
import Button from "@components/button/Button";
import HassuDialog from "@components/HassuDialog";
import Section from "@components/layout/Section2";
import { TiedottaminenPageLayout } from "@components/projekti/tiedottaminen/TiedottaminenPageLayout";
import { H2, H3, H4 } from "@components/Headings";
import ContentSpacer from "@components/layout/ContentSpacer";
import { Stack } from "@mui/system";
import { Omistaja, OmistajahakuTila, OmistajaInput, TallennaKiinteistonOmistajatMutationVariables } from "@services/api";
import useSnackbars from "src/hooks/useSnackbars";
import { GrayBackgroundText } from "../../../../../components/projekti/GrayBackgroundText";
import { useProjekti } from "src/hooks/useProjekti";
import { useProjektinTiedottaminen } from "src/hooks/useProjektinTiedottaminen";
import { yupResolver } from "@hookform/resolvers/yup";
import { UseFormProps, useForm, SubmitHandler, FormProvider, Controller, UseFieldArrayProps } from "react-hook-form";
import { kiinteistonOmistajatSchema } from "src/schemas/kiinteistonOmistajat";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import useApi from "src/hooks/useApi";
import { formatKiinteistotunnusForDatabase, formatKiinteistotunnusForDisplay } from "common/util/formatKiinteistotunnus";
import { ColumnDef } from "@tanstack/react-table";
import TiedotettavaHaitari, { GetTiedotettavaFunc } from "@components/projekti/tiedottaminen/TiedotettavaHaitari";

export default function Kiinteistonomistajat() {
  return (
    <ProjektiConsumer useProjektiOptions={{ revalidateOnMount: true }}>
      {(projekti) => <KiinteistonomistajatPage projekti={projekti} />}
    </ProjektiConsumer>
  );
}

export type OmistajaRow = Omistaja & { toBeDeleted: boolean; rowIndex: number };

export type KiinteistonOmistajatFormFields = {
  oid: string;
  suomifiOmistajat: OmistajaRow[];
  muutOmistajat: OmistajaRow[];
  uudetOmistajat: OmistajaRow[];
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

const getFormDefaultValues: (oid: string) => KiinteistonOmistajatFormFields = (oid) => ({
  oid,
  muutOmistajat: [],
  suomifiOmistajat: [],
  uudetOmistajat: [],
});

const formOptions: (oid: string) => UseFormProps<KiinteistonOmistajatFormFields> = (oid) => ({
  resolver: yupResolver(kiinteistonOmistajatSchema, { abortEarly: false, recursive: true }),
  mode: "onChange",
  reValidateMode: "onChange",
  defaultValues: getFormDefaultValues(oid),
  shouldUnregister: false,
});

const mapFormDataForApi: (data: KiinteistonOmistajatFormFields) => TallennaKiinteistonOmistajatMutationVariables = (data) => {
  const poistettavatOmistajat = [...data.muutOmistajat, ...data.suomifiOmistajat]
    .filter((omistaja) => omistaja.toBeDeleted)
    .map(({ id }) => id);
  const muutOmistajatRows = [
    ...data.muutOmistajat,
    ...data.uudetOmistajat.map<OmistajaRow>(({ kiinteistotunnus, ...omistaja }) => ({
      kiinteistotunnus: formatKiinteistotunnusForDatabase(kiinteistotunnus),
      ...omistaja,
    })),
  ];
  const muutOmistajat = muutOmistajatRows
    .filter((omistaja) => !omistaja.toBeDeleted)
    .map<OmistajaInput>(({ id, jakeluosoite, kiinteistotunnus, nimi, paikkakunta, postinumero }) => ({
      id,
      jakeluosoite,
      kiinteistotunnus,
      nimi,
      paikkakunta,
      postinumero,
    }));
  const variables: TallennaKiinteistonOmistajatMutationVariables = {
    oid: data.oid,
    muutOmistajat,
    poistettavatOmistajat,
  };

  return variables;
};

type FieldArrayName = UseFieldArrayProps<KiinteistonOmistajatFormFields>["name"];

const getDefaultColumnMeta = () => ({
  widthFractions: 3,
  minWidth: 200,
});

function createPoistaColumn(fieldArrayName: FieldArrayName): ColumnDef<OmistajaRow, unknown> {
  const column: ColumnDef<OmistajaRow, unknown> = {
    header: "Poista",
    id: "actions",
    meta: {
      widthFractions: 2,
      minWidth: 120,
    },
    cell: (context) => {
      const rowIndex = context.row.original.rowIndex;

      return (
        <Controller
          name={`${fieldArrayName}.${rowIndex}.toBeDeleted`}
          render={({ field: { value, onChange, ...field } }) => (
            <Checkbox
              checked={value}
              onChange={(event) => {
                const checked = event.target.checked;
                onChange(checked);
              }}
              {...field}
              name={`${fieldArrayName}.${rowIndex}.toBeDeleted`}
            />
          )}
        />
      );
    },
  };
  return column;
}

const readColumns: ColumnDef<Omistaja>[] = [
  {
    header: "Kiinteistötunnus",
    id: "kiinteistotunnus",
    accessorFn: ({ kiinteistotunnus }) => formatKiinteistotunnusForDisplay(kiinteistotunnus),
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
      minWidth: 250,
    },
  },
  { header: "Postiosoite", accessorKey: "jakeluosoite", id: "postiosoite", meta: getDefaultColumnMeta() },
  { header: "Postinumero", accessorKey: "postinumero", id: "postinumero", meta: getDefaultColumnMeta() },
  { header: "Postitoimipaikka", accessorFn: ({ paikkakunta }) => paikkakunta, id: "postitoimipaikka", meta: getDefaultColumnMeta() },
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
      <Section noDivider>
        <ContentSpacer gap={7}>
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
          <TiedotettavaHaitari
            oid={projekti.oid}
            title="Kiinteistönomistajien tiedotus Suomi.fi -palvelulla"
            instructionText="Kuulutus toimitetaan alle listatuille kiinteistönomistajille järjestelmän kautta kuulutuksen julkaisupäivänä. Kiinteistönomistajista viedään vastaanottajalista automaattisesti asianhallintaan, kun kuulutus julkaistaan."
            filterText="Suodata kiinteistönomistajia"
            columns={readColumns}
            getTiedotettavatCallback={getKiinteistonOmistajatCallback}
            muutTiedotettavat={false}
          />
          <TiedotettavaHaitari
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
            filterText="Suodata kiinteistönomistajia"
            columns={readColumns}
            getTiedotettavatCallback={getKiinteistonOmistajatCallback}
            muutTiedotettavat={true}
          />
          <MuokkaaButton primary type="button" onClick={openMuokkaaDialog}>
            Muokkaa
          </MuokkaaButton>
          <MuokkausDialog open={isMuokkaaDialogOpen} close={closeMuokkaaDialog} oid={projekti.oid} />
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

const MuokkausDialog: VFC<DialogProps & { close: () => void; oid: string }> = ({ close, onClose, oid, ...props }) => {
  const useFormReturn = useForm<KiinteistonOmistajatFormFields>(formOptions(oid));
  const { withLoadingSpinner } = useLoadingSpinner();
  const { showErrorMessage } = useSnackbars();
  const api = useApi();

  const onSubmit = useCallback<SubmitHandler<KiinteistonOmistajatFormFields>>(
    (data) => {
      withLoadingSpinner(
        (async () => {
          let apiData: TallennaKiinteistonOmistajatMutationVariables | undefined = undefined;
          try {
            apiData = mapFormDataForApi(data);
          } catch {
            showErrorMessage("Lomakkeen tietoja ei pystytty muuttamaan tallennettavaan muotoon");
          }
          if (apiData) {
            await api.tallennaKiinteistonOmistajat(apiData);
            useFormReturn.reset();
          }
        })()
      );
    },
    [api, showErrorMessage, useFormReturn, withLoadingSpinner]
  );
  return (
    <Dialog fullScreen onClose={close} {...props} open={true}>
      <FormProvider {...useFormReturn}>
        <DialogForm>
          <DialogContent>
            <Section>
              <H3>Kiinteistönomistajien tiedotus Suomi.fi -palvelulla</H3>
              {/* <HassuTable colu /> */}
            </Section>
            <Section>
              <H3>Kiinteistönomistajien tiedotus muilla tavoin</H3>
              <H4>Lisää muilla tavoin tiedotettava kiinteistönomistaja</H4>
            </Section>
          </DialogContent>
          <DialogActions>
            <Button type="button" onClick={close}>
              Sulje
            </Button>
            <Button type="button" primary onClick={close}>
              Tallenna
            </Button>
          </DialogActions>
        </DialogForm>
      </FormProvider>
    </Dialog>
  );
};

const DialogForm = styled("form")({ display: "contents" });
