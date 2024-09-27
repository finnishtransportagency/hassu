import React, { useCallback, useState, useMemo, FunctionComponent } from "react";
import { Autocomplete, DialogActions, DialogContent, Stack, styled, TextField } from "@mui/material";
import Button from "@components/button/Button";
import Section from "@components/layout/Section2";
import { H3, H4 } from "@components/Headings";
import { KiinteistonOmistajat, Omistaja, OmistajaInput, TallennaKiinteistonOmistajatMutationVariables } from "@services/api";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  UseFormProps,
  useForm,
  SubmitHandler,
  FormProvider,
  useFieldArray,
  useFormContext,
  Controller,
  useController,
} from "react-hook-form";
import { kiinteistonOmistajatSchema } from "src/schemas/kiinteistonOmistajat";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import useApi from "src/hooks/useApi";
import { ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { formatKiinteistotunnusForDatabase } from "common/util/formatKiinteistotunnus";
import { RectangleButton } from "@components/button/RectangleButton";
import { TextFieldWithController } from "@components/form/TextFieldWithController";
import { ButtonFlatWithIcon } from "@components/button/ButtonFlat";
import HassuTable from "@components/table/HassuTable";
import useSnackbars from "src/hooks/useSnackbars";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import log from "loglevel";
import { getLocalizedCountryName } from "common/getLocalizedCountryName";
import lookup from "country-code-lookup";
import { GrayBackgroundText } from "@components/projekti/GrayBackgroundText";
import { ProjektiLisatiedolla } from "common/ProjektiValidationContext";
import { useRouter } from "next/router";
import useLeaveConfirm from "src/hooks/useLeaveConfirm";
import HassuDialog from "@components/HassuDialog";

type OmistajaRow = Omit<OmistajaInput, "maakoodi"> & {
  toBeDeleted: boolean;
  maakoodi: string | null;
  maa: string | null | undefined;
};

type KiinteistonOmistajatFormFields = {
  oid: string;
  suomifiOmistajat: OmistajaRow[];
  muutOmistajat: OmistajaRow[];
  lisatytOmistajat: OmistajaRow[];
};

const PAGE_SIZE = 25;

const mapOmistajaToOmistajaRow =
  (...fieldsToSetDefaultsTo: (keyof OmistajaInput)[]) =>
  ({ id, kiinteistotunnus, jakeluosoite, nimi, paikkakunta, postinumero, maa, maakoodi }: Omistaja): OmistajaRow => {
    const omistajaRow: OmistajaRow = {
      id,
      kiinteistotunnus,
      jakeluosoite,
      nimi,
      paikkakunta,
      postinumero,
      toBeDeleted: false,
      maakoodi: maakoodi ?? null,
      maa,
    };
    fieldsToSetDefaultsTo.forEach((key) => {
      omistajaRow[key] = omistajaRow[key] ?? "";
    });
    return omistajaRow;
  };

type PoistettavaOmistaja = Omit<OmistajaRow, "id"> & { id: string };

const mapFormDataForApi: (data: KiinteistonOmistajatFormFields) => TallennaKiinteistonOmistajatMutationVariables = (data) => {
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
  const muutOmistajat = muutOmistajatRows.map<OmistajaInput>(
    ({ id, jakeluosoite, kiinteistotunnus, nimi, paikkakunta, postinumero, maakoodi }) => ({
      id,
      jakeluosoite,
      kiinteistotunnus,
      nimi,
      paikkakunta,
      postinumero,
      maakoodi,
    })
  );
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
            {value ? "Kumoa poisto" : <FontAwesomeIcon icon="trash" size="lg" />}
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
    accessorKey: "kiinteistotunnus",
    meta: getDefaultColumnMeta(),
  },
  {
    header: "Omistajan nimi",
    accessorKey: "nimi",
    id: "omistajan_nimi",
    meta: getDefaultColumnMeta(),
  },
  {
    header: "Postiosoite",
    accessorKey: "jakeluosoite",
    id: "postiosoite",
    meta: getDefaultColumnMeta(),
  },
  {
    header: "Postinumero",
    accessorKey: "postinumero",
    id: "postinumero",
    meta: getDefaultColumnMeta(),
  },
  {
    header: "Postitoimipaikka",
    accessorKey: "paikkakunta",
    id: "postitoimipaikka",
    meta: getDefaultColumnMeta(),
  },
  {
    header: "Maa",
    accessorFn: ({ maakoodi }) => getLocalizedCountryName("fi", maakoodi ?? "FI"),
    id: "maakoodi",
    meta: getDefaultColumnMeta(),
  },

  createPoistaColumn("suomifiOmistajat"),
];

const muutColumns: ColumnDef<OmistajaRow>[] = [
  {
    header: "Kiinteistötunnus",
    id: "kiinteistotunnus",
    accessorKey: "kiinteistotunnus",
    meta: getDefaultColumnMeta(),
  },
  {
    header: "Omistajan nimi",
    accessorKey: "nimi",
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
        fullWidth
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
        fullWidth
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
        fullWidth
        controllerProps={{ name: `muutOmistajat.${context.row.index}.paikkakunta` }}
      />
    ),
  },
  {
    header: "Maa",
    accessorFn: ({ paikkakunta }) => paikkakunta,
    id: "maakoodi",
    meta: getDefaultColumnMeta(),
    cell: (context) => <Maa fieldArrayName="muutOmistajat" index={context.row.index} />,
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
        fullWidth
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
        fullWidth
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
        fullWidth
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
        fullWidth
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
        fullWidth
        controllerProps={{ name: `lisatytOmistajat.${context.row.index}.paikkakunta` }}
      />
    ),
  },
  {
    header: "Maa",
    accessorFn: ({ paikkakunta }) => paikkakunta,
    id: "maakoodi",
    meta: getDefaultColumnMeta(),
    cell: (context) => <Maa fieldArrayName="lisatytOmistajat" index={context.row.index} />,
  },
  createPoistaColumn("lisatytOmistajat"),
];

const countryCodesSorted = lookup.countries
  .map((country) => country.iso2)
  .sort((codeA, codeB) => {
    const nameA = getLocalizedCountryName("fi", codeA);
    const nameB = getLocalizedCountryName("fi", codeB);
    return nameA.localeCompare(nameB);
  });

const Maa = ({ fieldArrayName, index }: { fieldArrayName: "suomifiOmistajat" | "muutOmistajat" | "lisatytOmistajat"; index: number }) => {
  const { control } = useFormContext<KiinteistonOmistajatFormFields>();

  const {
    field: { ref, onChange, onBlur, name, value },
  } = useController({ name: `${fieldArrayName}.${index}.maakoodi`, control });

  const [inputValue, setInputValue] = React.useState("");

  return (
    <Autocomplete
      options={countryCodesSorted}
      renderInput={({ inputProps = {}, ...params }) => <TextField {...params} name={name} inputProps={{ ref, ...inputProps }} required />}
      getOptionLabel={(code) => getLocalizedCountryName("fi", code)}
      value={value}
      disablePortal={false}
      inputValue={inputValue}
      renderOption={(props, code) => {
        return (
          <li {...props} key={code}>
            {getLocalizedCountryName("fi", code)}
          </li>
        );
      }}
      onInputChange={(_event, newInputValue) => {
        setInputValue(newInputValue);
      }}
      onChange={(_event, newValue) => {
        onChange(newValue);
      }}
      onBlur={onBlur}
    />
  );
};

export type InitialSearchResponses = {
  suomifi: KiinteistonOmistajat;
  muut: KiinteistonOmistajat;
  lisatyt: KiinteistonOmistajat;
};

export const FormContents: FunctionComponent<{
  projekti: ProjektiLisatiedolla;
  initialSearchResponses: InitialSearchResponses;
}> = ({ projekti, initialSearchResponses }) => {
  const useFormReturn = useForm<KiinteistonOmistajatFormFields>(
    getFormOptions({
      oid: projekti.oid,
      suomifiOmistajat: initialSearchResponses.suomifi.omistajat.map(mapOmistajaToOmistajaRow()),
      muutOmistajat: initialSearchResponses.muut.omistajat.map(mapOmistajaToOmistajaRow("jakeluosoite", "postinumero", "paikkakunta")),
      lisatytOmistajat: initialSearchResponses.lisatyt.omistajat.map(
        mapOmistajaToOmistajaRow("kiinteistotunnus", "nimi", "jakeluosoite", "postinumero", "paikkakunta")
      ),
    })
  );

  const {
    handleSubmit,
    formState: { isDirty, isSubmitting },
    getValues,
  } = useFormReturn;
  useLeaveConfirm(!isSubmitting && isDirty);
  const { withLoadingSpinner } = useLoadingSpinner();

  const api = useApi();
  const { showErrorMessage, showSuccessMessage } = useSnackbars();
  const router = useRouter();

  function getRemoveCount() {
    return (
      getValues().muutOmistajat.filter((o) => o.toBeDeleted).length +
      getValues().suomifiOmistajat.filter((o) => o.toBeDeleted).length +
      getValues().lisatytOmistajat.filter((o) => o.toBeDeleted && o.id).length
    );
  }
  const [poistaDialogOpen, setPoistaDialogOpen] = useState(false);
  const onSubmit = useCallback<SubmitHandler<KiinteistonOmistajatFormFields>>(
    (data) => {
      withLoadingSpinner(
        (async () => {
          setPoistaDialogOpen(false);
          let apiData: TallennaKiinteistonOmistajatMutationVariables | undefined = undefined;
          try {
            apiData = mapFormDataForApi(data);
          } catch (error) {
            log.error("Virhe kiinteistötietojen muuttamisessa tallennettavaan muotoon \n", error, data);
            showErrorMessage("Lomakkeen tietoja ei pystytty muuttamaan tallennettavaan muotoon");
          }
          if (apiData) {
            try {
              const ids = await api.tallennaKiinteistonOmistajat(apiData);
              const newData: KiinteistonOmistajatFormFields = {
                oid: data.oid,
                suomifiOmistajat: data.suomifiOmistajat.filter((m) => !apiData?.poistettavatOmistajat.includes(m.id ?? "")),
                muutOmistajat: data.muutOmistajat.filter((m) => !apiData?.poistettavatOmistajat.includes(m.id ?? "")),
                lisatytOmistajat: data.lisatytOmistajat.filter((m) => !apiData?.poistettavatOmistajat.includes(m.id ?? "")),
              };
              for (let i = 0; i < ids.length; i++) {
                if (!newData.lisatytOmistajat[i].id) {
                  newData.lisatytOmistajat[i].id = ids[i];
                }
              }
              // poistetaan uusi lisätty mutta merkitty poistetuksi
              newData.lisatytOmistajat = newData.lisatytOmistajat.filter((o) => !(!o.id && o.toBeDeleted));
              useFormReturn.reset(newData);
              showSuccessMessage("Kiinteistönomistajatiedot tallennettu");
            } catch (error) {
              log.error("Virhe kiinteistötietojen tallennuksessa: \n", error, apiData);
            }
          }
        })()
      );
    },
    [api, showErrorMessage, showSuccessMessage, useFormReturn, withLoadingSpinner]
  );

  const resetAndClose = useCallback(async () => {
    await router.push({ pathname: "/yllapito/projekti/[oid]/tiedottaminen/kiinteistonomistajat", query: { oid: projekti.oid } });
  }, [router, projekti.oid]);

  return (
    <FormProvider {...useFormReturn}>
      <DialogForm>
        <DialogContent>
          <Section noDivider>
            <H3>Kiinteistönomistajien tiedotus Suomi.fi -palvelulla</H3>
            <p>
              Ilmoitus toimitetaan alle listatuille kiinteistönomistajille järjestelmän kautta kuulutuksen julkaisupäivänä.
              Kiinteistönomistajista viedään vastaanottajalista automaattisesti asianhallintaan, kun kuulutus hyväksytään julkaistavaksi.
            </p>
            {initialSearchResponses.suomifi.hakutulosMaara ? (
              <PaginatedTaulukko
                oid={projekti.oid}
                initialHakutulosMaara={initialSearchResponses.suomifi.hakutulosMaara}
                columns={suomifiColumns}
                fieldArrayName="suomifiOmistajat"
              />
            ) : (
              <GrayBackgroundText>
                <p>Karttarajaukseen ei osunut ainuttakaan Suomi.fi-tiedotettavaa.</p>
              </GrayBackgroundText>
            )}
          </Section>
          <Section>
            <H3>Kiinteistönomistajien tiedotus muilla tavoin</H3>
            <p>
              Huomaathan, että kaikkien kiinteistönomistajien tietoja ei ole mahdollista löytää järjestelmän kautta. Tällöin tieto
              kuulutuksesta toimitetaan kiinteistönomistajalle järjestelmän ulkopuolella. Voit listata alle kiinteistönomistajien osoitteen
              muistiin. Lähetä kaikille tässä listassa oleville kiinteistönomistajille ilmoitus kuulutuksesta postitse.
              Kiinteistönomistajista viedään vastaanottajalista automaattisesti asianhallintaan, kun kuulutus hyväksytään julkaistavaksi.
            </p>
            {initialSearchResponses.muut.hakutulosMaara ? (
              <PaginatedTaulukko
                oid={projekti.oid}
                initialHakutulosMaara={initialSearchResponses.muut.hakutulosMaara}
                columns={muutColumns}
                fieldArrayName="muutOmistajat"
              />
            ) : (
              <GrayBackgroundText>
                <p>Karttarajaukseen ei osunut ainuttakaan muilla tavoin tiedotettavaa.</p>
              </GrayBackgroundText>
            )}
            <H4>Lisää muilla tavoin tiedotettava kiinteistönomistaja</H4>
            <p>
              Tässä voit lisätä muulla tavalla tiedotettavia kiinteistönomistajia. Huomaathan, että ne lisätään
              kiinteistönomistajalistaukseen vasta tallennuksen jälkeen.
            </p>
            <LisatytTaulukko />
          </Section>
          <Section noDivider>
            <Stack direction="row" justifyContent="end">
              <Button type="button" onClick={resetAndClose}>
                Palaa listaukseen
              </Button>
              <Button type="button" onClick={getRemoveCount() > 0 ? () => setPoistaDialogOpen(true) : handleSubmit(onSubmit)} primary>
                Tallenna
              </Button>
            </Stack>
          </Section>
        </DialogContent>
      </DialogForm>
      <HassuDialog open={poistaDialogOpen} title="Kiinteistönomistajatietojen tallentaminen" onClose={() => setPoistaDialogOpen(false)}>
        <DialogContent>
          <p>{`Olet poistamassa ${getRemoveCount()} määrä kiinteistönomistajia. Tallenna vahvistaaksesi.`}</p>
        </DialogContent>
        <DialogActions>
          <Button type="button" onClick={() => setPoistaDialogOpen(false)}>
            Peruuta
          </Button>
          <Button type="button" onClick={handleSubmit(onSubmit)} primary>
            Tallenna
          </Button>
        </DialogActions>
      </HassuDialog>
    </FormProvider>
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
  const {
    control,
    reset,
    formState: { isDirty },
  } = useFormContext<KiinteistonOmistajatFormFields>();
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
            if (!isDirty) {
              reset(undefined, { keepValues: true });
            }
          } catch {}
        })()
      );
    },
    [api, appendMuut, fieldArrayName, fields, oid, withLoadingSpinner, isDirty, reset]
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
      {!!fields.length && <HassuTable table={table} />}
      <Button
        type="button"
        onClick={() => {
          append({
            nimi: "",
            maa: null,
            jakeluosoite: "",
            kiinteistotunnus: "",
            postinumero: "",
            paikkakunta: "",
            maakoodi: null,
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
