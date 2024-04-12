import React, { useCallback, useState, VFC, useEffect, useMemo } from "react";
import { Dialog, DialogContent, Stack, styled } from "@mui/material";
import Button from "@components/button/Button";
import Section from "@components/layout/Section2";
import { H2, H3, H4 } from "@components/Headings";
import { KiinteistonOmistajat, Omistaja, OmistajaInput, TallennaKiinteistonOmistajatMutationVariables } from "@services/api";
import { yupResolver } from "@hookform/resolvers/yup";
import { UseFormProps, useForm, SubmitHandler, FormProvider, useFieldArray, useFormContext, Controller } from "react-hook-form";
import { kiinteistonOmistajatSchema } from "src/schemas/kiinteistonOmistajat";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import useApi from "src/hooks/useApi";
import { ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { formatKiinteistotunnusForDatabase, formatKiinteistotunnusForDisplay } from "common/util/formatKiinteistotunnus";
import { RectangleButton } from "@components/button/RectangleButton";
import { TextFieldWithController } from "@components/form/TextFieldWithController";
import { ButtonFlatWithIcon } from "@components/button/ButtonFlat";
import HassuTable from "@components/table/HassuTable";
import { GrayBackgroundText } from "../GrayBackgroundText";
import { useProjektinTiedottaminen } from "src/hooks/useProjektinTiedottaminen";
import useSnackbars from "src/hooks/useSnackbars";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export type OmistajaRow = OmistajaInput & { toBeDeleted: boolean; etunimet?: string | null; sukunimi?: string | null };

export type KiinteistonOmistajatFormFields = {
  oid: string;
  suomifiOmistajat: OmistajaRow[];
  muutOmistajat: OmistajaRow[];
  lisatytOmistajat: OmistajaRow[];
};

export const PAGE_SIZE = 25;

const mapOmistajaToOmistajaRow =
  (...fieldsToSetDefaultsTo: (keyof OmistajaInput)[]) =>
  ({ id, kiinteistotunnus, etunimet, sukunimi, jakeluosoite, nimi, paikkakunta, postinumero }: Omistaja): OmistajaRow => {
    const omistajaRow: OmistajaRow = {
      id,
      kiinteistotunnus,
      etunimet,
      sukunimi,
      jakeluosoite,
      nimi,
      paikkakunta,
      postinumero,
      toBeDeleted: false,
    };
    fieldsToSetDefaultsTo.forEach((key) => {
      omistajaRow[key] = omistajaRow[key] ?? "";
    });
    return omistajaRow;
  };

type PoistettavaOmistaja = Omit<OmistajaRow, "id"> & { id: string };

export const mapFormDataForApi: (data: KiinteistonOmistajatFormFields) => TallennaKiinteistonOmistajatMutationVariables = (data) => {
  const poistettavatOmistajat = [...data.muutOmistajat, ...data.suomifiOmistajat, ...data.lisatytOmistajat]
    .filter((omistaja): omistaja is PoistettavaOmistaja => !!omistaja.toBeDeleted && !!omistaja.id)
    .map(({ id }) => id);
  const muutOmistajatRows = [
    ...data.muutOmistajat.filter((omistaja) => !omistaja.toBeDeleted),
    ...data.lisatytOmistajat
      .filter((omistaja) => !omistaja.toBeDeleted)
      .map<OmistajaRow>(({ kiinteistotunnus, ...omistaja }) => ({
        kiinteistotunnus: formatKiinteistotunnusForDatabase(kiinteistotunnus),
        ...omistaja,
      })),
  ];
  const muutOmistajat = muutOmistajatRows.map<OmistajaInput>(({ id, jakeluosoite, kiinteistotunnus, nimi, paikkakunta, postinumero }) => ({
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

const getFormOptions: (defaultValues: KiinteistonOmistajatFormFields) => UseFormProps<KiinteistonOmistajatFormFields> = (
  defaultValues
) => ({
  resolver: yupResolver(kiinteistonOmistajatSchema, { abortEarly: false, recursive: true }),
  mode: "onChange",
  reValidateMode: "onChange",
  defaultValues,
  shouldUnregister: false,
});

const getDefaultColumnMeta = () => ({
  widthFractions: 3,
  minWidth: 200,
});

const createPoistaColumn = (
  fieldArrayName: "suomifiOmistajat" | "muutOmistajat" | "lisatytOmistajat"
): ColumnDef<OmistajaRow, unknown> => ({
  header: "Poista",
  id: "actions",
  meta: {
    widthFractions: 2,
    minWidth: 120,
  },
  cell: (context) => (
    <PoistaCell>
      <Controller
        name={`${fieldArrayName}.${context.row.id}.toBeDeleted`}
        shouldUnregister={false}
        render={({ field: { value, onChange, ...field } }) => (
          <StyledIconButton
            className={value ? "rectangle" : "icon"}
            type="button"
            onClick={() => {
              onChange(!value);
            }}
            {...field}
          >
            {value ? "Kumoa poisto" : <FontAwesomeIcon icon={"trash"} size="lg" />}
          </StyledIconButton>
        )}
      />
    </PoistaCell>
  ),
});

const StyledIconButton = styled("button")(({ theme }) => ({
  "&.rectangle": {
    "button&": {
      backgroundColor: "#0064AF",
      color: "#FFFFFF",
      fontWeight: 700,
      padding: "4px 12px",
      overflowWrap: "anywhere",
      hyphens: "auto",
    },
  },
  "&.icon": {
    height: theme.spacing(11),
    width: theme.spacing(11),
    padding: "1px",
    borderRadius: "50%",
    color: "#0064af",
    "&:not(:disabled)": {
      "&:hover": {
        backgroundColor: "rgba(0,0,0,.1)",
      },
      "&:active": {
        backgroundColor: "rgba(0,0,0,.05)",
      },
    },
    "&:disabled": {
      opacity: 0.5,
      cursor: "default",
    },
  },
}));

const PoistaCell = styled("span")({ minHeight: "44px", display: "flex", alignItems: "center" });

const suomifiColumns: ColumnDef<OmistajaRow>[] = [
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
    meta: getDefaultColumnMeta(),
  },
  { header: "Postiosoite", accessorKey: "jakeluosoite", id: "postiosoite", meta: getDefaultColumnMeta() },
  { header: "Postinumero", accessorKey: "postinumero", id: "postinumero", meta: getDefaultColumnMeta() },
  { header: "Postitoimipaikka", accessorFn: ({ paikkakunta }) => paikkakunta, id: "postitoimipaikka", meta: getDefaultColumnMeta() },
  createPoistaColumn("suomifiOmistajat"),
];

const muutColumns: ColumnDef<OmistajaRow>[] = [
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
    meta: getDefaultColumnMeta(),
  },
  {
    header: "Postiosoite",
    accessorKey: "jakeluosoite",
    id: "postiosoite",
    meta: getDefaultColumnMeta(),
    cell: (context) => (
      <TextFieldWithController<KiinteistonOmistajatFormFields>
        autoComplete="off"
        controllerProps={{ name: `muutOmistajat.${context.row.index}.jakeluosoite` }}
      />
    ),
  },
  {
    header: "Postinumero",
    accessorKey: "postinumero",
    id: "postinumero",
    meta: getDefaultColumnMeta(),
    cell: (context) => (
      <TextFieldWithController<KiinteistonOmistajatFormFields>
        autoComplete="off"
        controllerProps={{ name: `muutOmistajat.${context.row.index}.postinumero` }}
      />
    ),
  },
  {
    header: "Postitoimipaikka",
    accessorFn: ({ paikkakunta }) => paikkakunta,
    id: "postitoimipaikka",
    meta: getDefaultColumnMeta(),
    cell: (context) => (
      <TextFieldWithController<KiinteistonOmistajatFormFields>
        autoComplete="off"
        controllerProps={{ name: `muutOmistajat.${context.row.index}.paikkakunta` }}
      />
    ),
  },
  createPoistaColumn("muutOmistajat"),
];

const lisatytColumns: ColumnDef<OmistajaRow>[] = [
  {
    header: "Kiinteistötunnus",
    id: "kiinteistotunnus",
    meta: getDefaultColumnMeta(),
    cell: (context) => (
      <TextFieldWithController<KiinteistonOmistajatFormFields>
        autoComplete="off"
        controllerProps={{ name: `lisatytOmistajat.${context.row.index}.kiinteistotunnus` }}
      />
    ),
  },
  {
    header: "Omistajan nimi",
    id: "omistajan_nimi",
    meta: getDefaultColumnMeta(),
    cell: (context) => (
      <TextFieldWithController<KiinteistonOmistajatFormFields>
        autoComplete="off"
        controllerProps={{ name: `lisatytOmistajat.${context.row.index}.nimi` }}
      />
    ),
  },
  {
    header: "Postiosoite",
    accessorKey: "jakeluosoite",
    id: "postiosoite",
    meta: getDefaultColumnMeta(),
    cell: (context) => (
      <TextFieldWithController<KiinteistonOmistajatFormFields>
        autoComplete="off"
        controllerProps={{ name: `lisatytOmistajat.${context.row.index}.jakeluosoite` }}
      />
    ),
  },
  {
    header: "Postinumero",
    accessorKey: "postinumero",
    id: "postinumero",
    meta: getDefaultColumnMeta(),
    cell: (context) => (
      <TextFieldWithController<KiinteistonOmistajatFormFields>
        autoComplete="off"
        controllerProps={{ name: `lisatytOmistajat.${context.row.index}.postinumero` }}
      />
    ),
  },
  {
    header: "Postitoimipaikka",
    accessorFn: ({ paikkakunta }) => paikkakunta,
    id: "postitoimipaikka",
    meta: getDefaultColumnMeta(),
    cell: (context) => (
      <TextFieldWithController<KiinteistonOmistajatFormFields>
        autoComplete="off"
        controllerProps={{ name: `lisatytOmistajat.${context.row.index}.paikkakunta` }}
      />
    ),
  },
  createPoistaColumn("lisatytOmistajat"),
];

type InitialSearchResponses = {
  suomifi: KiinteistonOmistajat;
  muut: KiinteistonOmistajat;
  lisatyt: KiinteistonOmistajat;
};

export const MuokkausDialog: VFC<{ isOpen: boolean; close: () => void; oid: string; projektinimi: string | null | undefined }> = (
  props
) => {
  const [initialSearchResponses, setInitialSearchResponses] = useState<InitialSearchResponses | null>(null);
  const { withLoadingSpinner } = useLoadingSpinner();
  const api = useApi();

  useEffect(() => {
    if (props.isOpen) {
      withLoadingSpinner(
        (async () => {
          const suomifi = await api.haeKiinteistonOmistajat(props.oid, false, undefined, 0, PAGE_SIZE);
          const muut = await api.haeKiinteistonOmistajat(props.oid, true, undefined, 0, PAGE_SIZE, false, true);
          const lisatyt = await api.haeKiinteistonOmistajat(props.oid, true, undefined, 0, undefined, true);
          setInitialSearchResponses({ muut, suomifi, lisatyt });
        })()
      );
    } else {
      setInitialSearchResponses(null);
    }
  }, [api, props.isOpen, props.oid, withLoadingSpinner]);

  return <>{props.isOpen && initialSearchResponses && <MuokkausDialog2 {...props} initialSearchResponses={initialSearchResponses} />}</>;
};

export const MuokkausDialog2: VFC<{
  isOpen: boolean;
  close: () => void;
  oid: string;
  initialSearchResponses: InitialSearchResponses;
  projektinimi: string | null | undefined;
}> = ({ close, isOpen, oid, initialSearchResponses, projektinimi }) => {
  const useFormReturn = useForm<KiinteistonOmistajatFormFields>(
    getFormOptions({
      oid,
      suomifiOmistajat: initialSearchResponses.suomifi.omistajat.map(mapOmistajaToOmistajaRow()),
      muutOmistajat: initialSearchResponses.muut.omistajat.map(mapOmistajaToOmistajaRow("jakeluosoite", "postinumero", "paikkakunta")),
      lisatytOmistajat: initialSearchResponses.lisatyt.omistajat
        .map(mapOmistajaToOmistajaRow("kiinteistotunnus", "nimi", "jakeluosoite", "postinumero", "paikkakunta"))
        .map(({ kiinteistotunnus, ...omistaja }) => ({
          ...omistaja,
          kiinteistotunnus: formatKiinteistotunnusForDisplay(kiinteistotunnus),
        })),
    })
  );

  const { handleSubmit, reset, getValues } = useFormReturn;
  const { withLoadingSpinner } = useLoadingSpinner();

  const { data: projektinTiedottaminen } = useProjektinTiedottaminen();
  const api = useApi();
  const { showErrorMessage, showSuccessMessage } = useSnackbars();

  const onSubmit = useCallback<SubmitHandler<KiinteistonOmistajatFormFields>>(
    (data) => {
      withLoadingSpinner(
        (async () => {
          let apiData: TallennaKiinteistonOmistajatMutationVariables | undefined = undefined;
          try {
            apiData = mapFormDataForApi(data);
          } catch (e) {
            console.log(data, e);
            showErrorMessage("Lomakkeen tietoja ei pystytty muuttamaan tallennettavaan muotoon");
          }
          if (apiData) {
            await api.tallennaKiinteistonOmistajat(apiData);
            useFormReturn.reset(data);
            close();
            showSuccessMessage("Kiinteistönomistajatiedot tallennettu");
          }
        })()
      );
    },
    [api, close, showErrorMessage, showSuccessMessage, useFormReturn, withLoadingSpinner]
  );

  const resetAndClose = useCallback(() => {
    reset(getValues());
    close();
  }, [reset, getValues, close]);

  return (
    <Dialog PaperProps={{ sx: { paddingX: 20, paddingTop: 10 } }} scroll="body" fullScreen open={isOpen} onClose={close}>
      <FormProvider {...useFormReturn}>
        <DialogForm>
          <DialogContent>
            <Section noDivider>
              <H2 variant="h1">Muokkaa kiinteistönomistajatietoja</H2>
              <H3 variant="lead">{projektinimi}</H3>
              <GrayBackgroundText>
                <p>
                  Listalla on yhteensä <b>{projektinTiedottaminen?.kiinteistonomistajaMaara ?? "x"} kiinteistönomistaja(a)</b>.
                  Kiinteistötunnuksia on {projektinTiedottaminen?.kiinteistotunnusMaara ?? 0}.
                </p>
              </GrayBackgroundText>
              <p>
                Voit muokata, lisätä tai poistaa kiinteistönomistajatietoja. Huomaa, että muutokset tulevat voimaan vasta tallennettuasi
                muutokset.Suomi.fi -palvelun kautta tiedotettavien kiinteistönomistajien tietoja ei voi muokata, mutta vastaanottajia voi
                poistaa. Muulla tavalla tiedotettavien yhteystietoja on mahdollisuus muokata ja vastaanottajia poistaa, jonka lisäksi voit
                lisätä uusia vastaanottajia.
              </p>
            </Section>
            <Section noDivider>
              <H3>Kiinteistönomistajien tiedotus Suomi.fi -palvelulla</H3>
              <p>
                Kuulutus toimitetaan alle listatuille kiinteistönomistajille järjestelmän kautta kuulutuksen julkaisupäivänä.
                Kiinteistönomistajista viedään vastaanottajalista automaattisesti asianhallintaan, kun kuulutus hyväksytään julkaistavaksi.
              </p>
              <PaginatedTaulukko
                oid={oid}
                initialHakutulosMaara={initialSearchResponses.suomifi.hakutulosMaara}
                columns={suomifiColumns}
                fieldArrayName="suomifiOmistajat"
              />
            </Section>
            <Section>
              <H3>Kiinteistönomistajien tiedotus muilla tavoin</H3>
              <PaginatedTaulukko
                oid={oid}
                initialHakutulosMaara={initialSearchResponses.muut.hakutulosMaara}
                columns={muutColumns}
                fieldArrayName="muutOmistajat"
              />
              <H4>Lisää muilla tavoin tiedotettava kiinteistönomistaja</H4>
              <LisatytTaulukko />
            </Section>
            <Section noDivider>
              <Stack direction="row" justifyContent="end">
                <Button type="button" onClick={resetAndClose}>
                  Poistu tallentamatta
                </Button>
                <Button type="button" onClick={handleSubmit(onSubmit)} primary>
                  Tallenna
                </Button>
              </Stack>
            </Section>
          </DialogContent>
        </DialogForm>
      </FormProvider>
    </Dialog>
  );
};

const PaginatedTaulukko = ({
  oid,
  initialHakutulosMaara,
  columns,
  fieldArrayName,
}: {
  oid: string;
  initialHakutulosMaara: number;
  fieldArrayName: "muutOmistajat" | "suomifiOmistajat";
  columns: ColumnDef<OmistajaRow>[];
}) => {
  const { control } = useFormContext<KiinteistonOmistajatFormFields>();
  const [hakutulosMaara, setHakutulosMaara] = useState<number>(initialHakutulosMaara);
  const [sliceAt, setSliceAt] = useState(PAGE_SIZE);
  const { append: appendMuut, fields } = useFieldArray({ control, name: fieldArrayName, keyName: "fieldId" });
  const slicedFields = useMemo(() => fields.slice(0, sliceAt), [fields, sliceAt]);

  const api = useApi();
  const { withLoadingSpinner } = useLoadingSpinner();

  const updateMuut = useCallback<(from: number, size: number) => void>(
    (from, size) => {
      withLoadingSpinner(
        (async () => {
          try {
            const muutOmistajat = fieldArrayName === "muutOmistajat";
            const response = await api.haeKiinteistonOmistajat(oid, muutOmistajat, undefined, from, size, false, true);
            setHakutulosMaara(response.hakutulosMaara);
            const omistajat = response.omistajat;
            const resettableFields: (keyof OmistajaInput)[] = muutOmistajat ? ["jakeluosoite", "postinumero", "paikkakunta"] : [];
            const toBeAdded = omistajat
              .filter((omistaja) => !fields.some(({ id }) => id === omistaja.id))
              .map(mapOmistajaToOmistajaRow(...resettableFields));
            setSliceAt(Math.ceil((from + size) / PAGE_SIZE) * PAGE_SIZE);
            appendMuut(toBeAdded);
          } catch {}
        })()
      );
    },
    [api, appendMuut, fieldArrayName, fields, oid, withLoadingSpinner]
  );

  const showLess = useCallback(() => {
    setSliceAt((old) => old - PAGE_SIZE);
  }, []);

  const getNextPage = useCallback(() => {
    updateMuut(slicedFields.length, PAGE_SIZE);
  }, [slicedFields.length, updateMuut]);

  const toggleShowHideAll = useCallback(() => {
    if (slicedFields.length < (hakutulosMaara ?? 0)) {
      updateMuut(slicedFields.length, (hakutulosMaara ?? 0) - slicedFields.length);
    } else {
      setSliceAt(PAGE_SIZE);
    }
  }, [hakutulosMaara, slicedFields.length, updateMuut]);

  const table = useReactTable({
    columns: columns,
    getCoreRowModel: getCoreRowModel(),
    data: slicedFields,
    enableSorting: false,
    defaultColumn: { cell: (cell) => cell.getValue() || "-" },
    state: { pagination: undefined },
  });

  return (
    <>
      <HassuTable table={table} />
      <Stack alignItems="center">
        {slicedFields.length > PAGE_SIZE && (
          <RectangleButton type="button" onClick={showLess}>
            Näytä vähemmän kiinteistönomistajia
          </RectangleButton>
        )}
        {hakutulosMaara > slicedFields.length && (
          <RectangleButton type="button" onClick={getNextPage}>
            Näytä enemmän kiinteistönomistajia
          </RectangleButton>
        )}
        {hakutulosMaara > PAGE_SIZE && (
          <ButtonFlatWithIcon
            type="button"
            icon={hakutulosMaara <= slicedFields.length ? "chevron-up" : "chevron-down"}
            onClick={toggleShowHideAll}
          >
            {hakutulosMaara <= slicedFields.length ? "Piilota kaikki" : "Näytä kaikki"}
          </ButtonFlatWithIcon>
        )}
      </Stack>
    </>
  );
};

const LisatytTaulukko = () => {
  const { control } = useFormContext<KiinteistonOmistajatFormFields>();
  const { append, fields } = useFieldArray({ control, name: "lisatytOmistajat", keyName: "fieldId" });

  const table = useReactTable({
    columns: lisatytColumns,
    getCoreRowModel: getCoreRowModel(),
    data: fields,
    enableSorting: false,
    defaultColumn: { cell: (cell) => cell.getValue() || "-" },
    state: { pagination: undefined },
  });

  return (
    <>
      <HassuTable table={table} />
      <Button
        type="button"
        onClick={() => {
          append({
            nimi: "",
            jakeluosoite: "",
            kiinteistotunnus: "",
            postinumero: "",
            paikkakunta: "",
            toBeDeleted: false,
          });
        }}
      >
        Lisää uusi rivi
      </Button>
    </>
  );
};

const DialogForm = styled("form")({ display: "contents" });
