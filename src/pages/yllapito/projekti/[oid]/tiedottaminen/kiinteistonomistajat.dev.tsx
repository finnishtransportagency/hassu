import React, { useCallback, useState, VFC, useEffect, useMemo, useRef } from "react";
import { Checkbox, CircularProgress, Dialog, DialogActions, DialogContent, DialogProps, styled, TextField } from "@mui/material";
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
import { Omistaja, OmistajahakuTila, OmistajaInput, TallennaKiinteistonOmistajatMutationVariables } from "@services/api";
import useSnackbars from "src/hooks/useSnackbars";
import { GrayBackgroundText } from "../../../../../components/projekti/GrayBackgroundText";
import { useProjekti } from "src/hooks/useProjekti";
import { useProjektinTiedottaminen } from "src/hooks/useProjektinTiedottaminen";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  UseFormProps,
  useForm,
  SubmitHandler,
  FormProvider,
  useFieldArray,
  UseFormReturn,
  Controller,
  UseFieldArrayProps,
} from "react-hook-form";
import { kiinteistonOmistajatSchema } from "src/schemas/kiinteistonOmistajat";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import useApi from "src/hooks/useApi";
import { formatKiinteistotunnusForDatabase, formatKiinteistotunnusForDisplay } from "common/util/formatKiinteistotunnus";
import MuutOmistajatHaitari from "@components/projekti/tiedottaminen/MuutOmistajatHaitari";
import { ColumnDef } from "@tanstack/react-table";
import TiedotettavaHaitari from "@components/projekti/tiedottaminen/TiedotettavaHaitari";

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

type FormRef = React.MutableRefObject<UseFormReturn<KiinteistonOmistajatFormFields, object>>;

const createColumns: (fieldArrayName: FieldArrayName) => (useFormReturnRef: FormRef) => ColumnDef<OmistajaRow>[] =
  (fieldArrayName) => (useFormReturn) =>
    [
      createKiinteistotunnusColumn(),
      createNimiColumn(),
      createPostiosoiteColumn(useFormReturn, fieldArrayName),
      createPostinumeroColumn(useFormReturn, fieldArrayName),
      createPostitoimipaikkaColumn(useFormReturn, fieldArrayName),
      createPoistaColumn(fieldArrayName),
    ];

const getSuomifiColumns = createColumns("suomifiOmistajat");
const getMuutColumns = createColumns("muutOmistajat");

const defaultColumnMeta = {
  widthFractions: 3,
  minWidth: 200,
};

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

function createPostitoimipaikkaColumn(formRef: FormRef, fieldArrayName: FieldArrayName): ColumnDef<OmistajaRow, unknown> {
  const column: ColumnDef<OmistajaRow, unknown> = {
    header: "Postitoimipaikka",
    accessorKey: "paikkakunta",
    id: "postitoimipaikka",
    meta: defaultColumnMeta,
  };
  if (fieldArrayName !== "suomifiOmistajat") {
    column.cell = (context) => {
      const rowIndex = context.row.original.rowIndex;
      return <TextField {...formRef.current.register(`${fieldArrayName}.${rowIndex}.paikkakunta`)} fullWidth />;
    };
  }
  return column;
}

function createPostinumeroColumn(formRef: FormRef, fieldArrayName: FieldArrayName): ColumnDef<OmistajaRow, unknown> {
  const column: ColumnDef<OmistajaRow, unknown> = {
    header: "Postinumero",
    accessorKey: "postinumero",
    id: "postinumero",
    meta: defaultColumnMeta,
  };
  if (fieldArrayName !== "suomifiOmistajat") {
    column.cell = (context) => {
      const rowIndex = context.row.original.rowIndex;
      return <TextField {...formRef.current.register(`${fieldArrayName}.${rowIndex}.postinumero`)} fullWidth />;
    };
  }
  return column;
}

function createPostiosoiteColumn(formRef: FormRef, fieldArrayName: FieldArrayName): ColumnDef<OmistajaRow, unknown> {
  const column: ColumnDef<OmistajaRow, unknown> = {
    header: "Postiosoite",
    accessorKey: "jakeluosoite",
    id: "postiosoite",
    meta: defaultColumnMeta,
  };
  if (fieldArrayName !== "suomifiOmistajat") {
    column.cell = (context) => {
      const rowIndex = context.row.original.rowIndex;
      return <TextField {...formRef.current.register(`${fieldArrayName}.${rowIndex}.jakeluosoite`)} fullWidth />;
    };
  }
  return column;
}

function createNimiColumn(): ColumnDef<OmistajaRow, unknown> {
  const column: ColumnDef<OmistajaRow, unknown> = {
    header: "Omistajan nimi",
    accessorFn: ({ etunimet, sukunimi, nimi }) => nimi ?? (etunimet && sukunimi ? `${etunimet} ${sukunimi}` : null),
    id: "omistajan_nimi",
    meta: {
      widthFractions: 3,
      minWidth: 250,
    },
  };
  return column;
}

function createKiinteistotunnusColumn(): ColumnDef<OmistajaRow, unknown> {
  const column: ColumnDef<OmistajaRow, unknown> = {
    header: "Kiinteistötunnus",
    id: "kiinteistotunnus",
    accessorFn: ({ kiinteistotunnus }) => formatKiinteistotunnusForDisplay(kiinteistotunnus),
    meta: {
      widthFractions: 2,
      minWidth: 160,
    },
  };
  return column;
}

const KiinteistonomistajatPage: VFC<{ projekti: ProjektiLisatiedolla }> = ({ projekti }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hakuKaynnissa, setHakuKaynnissa] = useState(false);

  const [suomifiExpanded, setSuomifiExpanded] = useState(false);
  const [suomifiQueryResettable, setSuomifiQueryResettable] = useState<boolean>(false);
  const [suomifiHakutulosMaara, setSuomifiHakutulosMaara] = useState<number | null>(null);
  const [suomifiNaytettavatOmistajat, setSuomifiNaytettavatOmistajat] = useState<OmistajaRow[] | null>(null);
  const [suomifiQuery, setSuomifiQuery] = useState("");

  const [muutExpanded, setMuutExpanded] = useState(false);
  const [muutQueryResettable, setMuutQueryResettable] = useState<boolean>(false);
  const [muutHakutulosMaara, setMuutHakutulosMaara] = useState<number | null>(null);
  const [muutNaytettavatOmistajat, setMuutNaytettavatOmistajat] = useState<OmistajaRow[] | null>(null);
  const [muutQuery, setMuutQuery] = useState("");

  const { showErrorMessage } = useSnackbars();
  const { mutate } = useProjekti();
  const { data: projektinTiedottaminen } = useProjektinTiedottaminen();
  const { withLoadingSpinner } = useLoadingSpinner();
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

  const useFormReturn = useForm<KiinteistonOmistajatFormFields>(formOptions(projekti.oid));

  const { watch, control } = useFormReturn;
  const { append: appendMuutOmistajat } = useFieldArray({ control, name: "muutOmistajat" });
  const { append: appendSuomifiOmistajat } = useFieldArray({ control, name: "suomifiOmistajat" });

  const updateSuomifiTiedotettavat = useCallback<
    (query?: string, from?: number, size?: number, resetNaytettavatOmistajat?: boolean) => void
  >(
    (query?: string, from = suomifiNaytettavatOmistajat?.length ?? 0, size = PAGE_SIZE, resetNaytettavatOmistajat = false) => {
      withLoadingSpinner(
        (async () => {
          try {
            const response = await api.haeKiinteistonOmistajat(projekti.oid, false, query, from, size);
            setSuomifiQueryResettable(query !== undefined);
            setSuomifiHakutulosMaara(response.hakutulosMaara);
            const omistajatOnForm = watch("suomifiOmistajat");
            const { lisattavat, omistajat } = response.omistajat.reduce<{ lisattavat: OmistajaRow[]; omistajat: OmistajaRow[] }>(
              (acc, row) => {
                const omistajaFromForm = omistajatOnForm.find((omistaja) => omistaja.id === row.id);

                const omistajaRow: OmistajaRow = omistajaFromForm ?? {
                  ...row,
                  rowIndex: omistajatOnForm.length + acc.lisattavat.length,
                  toBeDeleted: false,
                };

                if (!omistajaFromForm) {
                  acc.lisattavat.push(omistajaRow);
                }

                acc.omistajat.push(omistajaRow);
                return acc;
              },
              { lisattavat: [], omistajat: [] }
            );
            appendSuomifiOmistajat(lisattavat);
            if (resetNaytettavatOmistajat) {
              setSuomifiNaytettavatOmistajat(omistajat);
            } else {
              setSuomifiNaytettavatOmistajat((oldOmistajat) => [...(oldOmistajat ?? []), ...omistajat]);
            }
          } catch {}
        })()
      );
    },
    [suomifiNaytettavatOmistajat?.length, withLoadingSpinner, api, projekti.oid, watch, appendSuomifiOmistajat]
  );
  const updateMuutTiedotettavat = useCallback<(query?: string, from?: number, size?: number, resetNaytettavatOmistajat?: boolean) => void>(
    (query?: string, from = muutNaytettavatOmistajat?.length ?? 0, size = PAGE_SIZE, resetNaytettavatOmistajat = false) => {
      withLoadingSpinner(
        (async () => {
          try {
            const response = await api.haeKiinteistonOmistajat(projekti.oid, true, query, from, size);
            setMuutQueryResettable(query !== undefined);
            setMuutHakutulosMaara(response.hakutulosMaara);
            const omistajatOnForm = watch("muutOmistajat");
            const { lisattavat, omistajat } = response.omistajat.reduce<{ lisattavat: OmistajaRow[]; omistajat: OmistajaRow[] }>(
              (acc, row) => {
                const omistajaFromForm = omistajatOnForm.find((omistaja) => omistaja.id === row.id);

                const omistajaRow: OmistajaRow = omistajaFromForm ?? {
                  ...row,
                  rowIndex: omistajatOnForm.length + acc.lisattavat.length,
                  toBeDeleted: false,
                };

                if (!omistajaFromForm) {
                  acc.lisattavat.push(omistajaRow);
                }

                acc.omistajat.push(omistajaRow);
                return acc;
              },
              { lisattavat: [], omistajat: [] }
            );
            appendMuutOmistajat(lisattavat);
            if (resetNaytettavatOmistajat) {
              setMuutNaytettavatOmistajat(omistajat);
            } else {
              setMuutNaytettavatOmistajat((oldOmistajat) => [...(oldOmistajat ?? []), ...omistajat]);
            }
          } catch {}
        })()
      );
    },
    [muutNaytettavatOmistajat?.length, withLoadingSpinner, api, projekti.oid, watch, appendMuutOmistajat]
  );

  const handleSuomifiExpansionChange = useCallback(
    (_event: React.SyntheticEvent, isExpanded: boolean) => {
      if (isExpanded) {
        updateSuomifiTiedotettavat();
      } else {
        setSuomifiNaytettavatOmistajat(null);
        setSuomifiHakutulosMaara(null);
        setSuomifiQuery("");
        setSuomifiQueryResettable(false);
      }
      setSuomifiExpanded(isExpanded);
    },
    [updateSuomifiTiedotettavat]
  );
  const handleMuutExpansionChange = useCallback(
    (_event: React.SyntheticEvent, isExpanded: boolean) => {
      if (isExpanded) {
        updateMuutTiedotettavat();
      } else {
        setMuutNaytettavatOmistajat(null);
        setMuutHakutulosMaara(null);
        setMuutQuery("");
        setMuutQueryResettable(false);
      }
      setMuutExpanded(isExpanded);
    },
    [updateMuutTiedotettavat]
  );

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
            if (suomifiExpanded) {
              updateSuomifiTiedotettavat(suomifiQuery, 0, suomifiNaytettavatOmistajat?.length, true);
            }
            if (muutExpanded) {
              updateMuutTiedotettavat(muutQuery, 0, muutNaytettavatOmistajat?.length, true);
            }
          }
        })()
      );
    },
    [
      api,
      muutExpanded,
      muutNaytettavatOmistajat?.length,
      muutQuery,
      showErrorMessage,
      suomifiExpanded,
      suomifiNaytettavatOmistajat?.length,
      suomifiQuery,
      updateMuutTiedotettavat,
      updateSuomifiTiedotettavat,
      useFormReturn,
      withLoadingSpinner,
    ]
  );

  const somsRef = useRef(useFormReturn);

  const suomifiColumns = useMemo(() => getSuomifiColumns(somsRef), []);
  const muutColumns = useMemo(() => getMuutColumns(somsRef), []);

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
        <FormProvider {...useFormReturn}>
          <ContentSpacer as="form" gap={7}>
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
            <TiedotettavaHaitari<OmistajaRow>
              oid={projekti.oid}
              expanded={suomifiExpanded}
              title="Kiinteistönomistajien tiedotus Suomi.fi -palvelulla"
              instructionText="Kuulutus toimitetaan alle listatuille kiinteistönomistajille järjestelmän kautta kuulutuksen julkaisupäivänä. Kiinteistönomistajista viedään vastaanottajalista automaattisesti asianhallintaan, kun kuulutus julkaistaan."
              query={suomifiQuery}
              setQuery={setSuomifiQuery}
              queryResettable={suomifiQueryResettable}
              hakutulosMaara={suomifiHakutulosMaara}
              tiedotettavat={suomifiNaytettavatOmistajat}
              setTiedotettavat={setSuomifiNaytettavatOmistajat}
              updateTiedotettavat={updateSuomifiTiedotettavat}
              onChange={handleSuomifiExpansionChange}
              filterText="Suodata kiinteistönomistajia"
              columns={suomifiColumns}
            />
            <MuutOmistajatHaitari
              oid={projekti.oid}
              expanded={muutExpanded}
              title="Kiinteistönomistajien tiedotus muilla tavoin"
              instructionText={
                <>
                  Huomaathan, että kaikkien kiinteistönomistajien tietoja ei ole mahdollista löytää järjestelmän kautta. Tälläisiä ovat{" "}
                  <span style={{ color: "#C73F01" }}>x, z, y</span> jolloin tieto kuulutuksesta toimitetaan kiinteistönomistajalle
                  järjestelmän ulkopuolella. Voit listata alle kiinteistönomistajien osoitteet muistiin ja lähettää heille kuulutuksen
                  postiosoitteisiin. Kiinteistönomistajista viedään vastaanottajalista asianhallintaan, kun kuulutus julkaistaan.
                </>
              }
              query={muutQuery}
              setQuery={setMuutQuery}
              queryResettable={muutQueryResettable}
              hakutulosMaara={muutHakutulosMaara}
              tiedotettavat={muutNaytettavatOmistajat}
              setTiedotettavat={setMuutNaytettavatOmistajat}
              updateTiedotettavat={updateMuutTiedotettavat}
              onChange={handleMuutExpansionChange}
              columns={muutColumns}
              filterText="Suodata kiinteistönomistajia"
            />
            <TallennaButton primary type="button" onClick={useFormReturn.handleSubmit(onSubmit)}>
              Tallenna
            </TallennaButton>
          </ContentSpacer>
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

const TallennaButton = styled(Button)({ marginLeft: "auto" });
