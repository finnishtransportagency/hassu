// Contains code generated or recommended by Amazon Q
import React, { useCallback, useState, useMemo, useRef, useContext, createContext, FunctionComponent } from "react";
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
import { ButtonFlat, ButtonFlatWithIcon } from "@components/button/ButtonFlat";
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
import readXlsxFile, { readSheetNames } from "read-excel-file/browser";
import { findColumnIndices, matchExcelRowsToOmistajat, getSheetIndexToRead } from "src/util/excelImport";

type SuodatusState = {
  suomifiOmistajat?: Set<number>;
  muutOmistajat?: Set<number>;
  lisatytOmistajat?: Set<number>;
} | null;

const SuodatusContext = createContext<SuodatusState>(null);

type OmistajaRow = Omit<OmistajaInput, "maakoodi"> & {
  toBeDeleted: boolean;
  maakoodi: string | null;
  maa: string | null | undefined;
  osoitetiedotSaatu?: boolean | null;
  userCreated?: boolean | null;
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
  ({
    id,
    kiinteistotunnus,
    jakeluosoite,
    nimi,
    paikkakunta,
    postinumero,
    maa,
    maakoodi,
    osoitetiedotSaatu,
    userCreated,
  }: Omistaja): OmistajaRow => {
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
      osoitetiedotSaatu,
      userCreated,
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
  const suomifiOmistajat = data.suomifiOmistajat
    .filter((omistaja) => !omistaja.toBeDeleted && (omistaja.osoitetiedotSaatu === false || omistaja.userCreated === true))
    .map<OmistajaInput>(({ id, jakeluosoite, kiinteistotunnus, nimi, paikkakunta, postinumero, maakoodi, userCreated }) => ({
      id,
      jakeluosoite,
      kiinteistotunnus: userCreated ? formatKiinteistotunnusForDatabase(kiinteistotunnus) : kiinteistotunnus,
      nimi,
      paikkakunta,
      postinumero,
      maakoodi,
    }));
  const variables: TallennaKiinteistonOmistajatMutationVariables = {
    oid: data.oid,
    muutOmistajat,
    poistettavatOmistajat,
    suomifiOmistajat: suomifiOmistajat.length > 0 ? suomifiOmistajat : undefined,
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

const isEditable = (row: OmistajaRow) => row.osoitetiedotSaatu === false || row.userCreated === true;

const suomifiColumns: ColumnDef<OmistajaRow>[] = [
  {
    header: "Kiinteistötunnus",
    id: "kiinteistotunnus",
    accessorKey: "kiinteistotunnus",
    meta: getDefaultColumnMeta(),
    cell: (context) =>
      context.row.original.userCreated ? (
        <TextFieldWithController<KiinteistonOmistajatFormFields>
          autoComplete="off"
          fullWidth
          controllerProps={{ name: `suomifiOmistajat.${Number(context.row.id)}.kiinteistotunnus` }}
        />
      ) : (
        <>{context.getValue() || "-"}</>
      ),
  },
  {
    header: "Omistajan nimi",
    accessorKey: "nimi",
    id: "omistajan_nimi",
    meta: getDefaultColumnMeta(),
    cell: (context) =>
      context.row.original.userCreated ? (
        <TextFieldWithController<KiinteistonOmistajatFormFields>
          autoComplete="off"
          fullWidth
          controllerProps={{ name: `suomifiOmistajat.${Number(context.row.id)}.nimi` }}
        />
      ) : (
        <>{context.getValue() || "-"}</>
      ),
  },
  {
    header: "Postiosoite",
    accessorKey: "jakeluosoite",
    id: "postiosoite",
    meta: getDefaultColumnMeta(),
    cell: (context) =>
      isEditable(context.row.original) ? (
        <TextFieldWithController<KiinteistonOmistajatFormFields>
          autoComplete="off"
          fullWidth
          controllerProps={{ name: `suomifiOmistajat.${Number(context.row.id)}.jakeluosoite` }}
        />
      ) : (
        <>{context.getValue() || "-"}</>
      ),
  },
  {
    header: "Postinumero",
    accessorKey: "postinumero",
    id: "postinumero",
    meta: getDefaultColumnMeta(),
    cell: (context) =>
      isEditable(context.row.original) ? (
        <TextFieldWithController<KiinteistonOmistajatFormFields>
          autoComplete="off"
          fullWidth
          controllerProps={{ name: `suomifiOmistajat.${Number(context.row.id)}.postinumero` }}
        />
      ) : (
        <>{context.getValue() || "-"}</>
      ),
  },
  {
    header: "Postitoimipaikka",
    accessorKey: "paikkakunta",
    id: "postitoimipaikka",
    meta: getDefaultColumnMeta(),
    cell: (context) =>
      isEditable(context.row.original) ? (
        <TextFieldWithController<KiinteistonOmistajatFormFields>
          autoComplete="off"
          fullWidth
          controllerProps={{ name: `suomifiOmistajat.${Number(context.row.id)}.paikkakunta` }}
        />
      ) : (
        <>{context.getValue() || "-"}</>
      ),
  },
  {
    header: "Maa",
    accessorFn: ({ maakoodi }) => getLocalizedCountryName("fi", maakoodi ?? "FI"),
    id: "maakoodi",
    meta: getDefaultColumnMeta(),
    cell: (context) =>
      isEditable(context.row.original) ? (
        <Maa fieldArrayName="suomifiOmistajat" index={Number(context.row.id)} />
      ) : (
        <>{context.getValue() || "-"}</>
      ),
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
        controllerProps={{ name: `muutOmistajat.${Number(context.row.id)}.jakeluosoite` }}
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
        controllerProps={{ name: `muutOmistajat.${Number(context.row.id)}.postinumero` }}
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
        controllerProps={{ name: `muutOmistajat.${Number(context.row.id)}.paikkakunta` }}
      />
    ),
  },
  {
    header: "Maa",
    accessorFn: ({ paikkakunta }) => paikkakunta,
    id: "maakoodi",
    meta: getDefaultColumnMeta(),
    cell: (context) => <Maa fieldArrayName="muutOmistajat" index={Number(context.row.id)} />,
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
        controllerProps={{ name: `lisatytOmistajat.${Number(context.row.id)}.kiinteistotunnus` }}
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
        controllerProps={{ name: `lisatytOmistajat.${Number(context.row.id)}.nimi` }}
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
        controllerProps={{ name: `lisatytOmistajat.${Number(context.row.id)}.jakeluosoite` }}
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
        controllerProps={{ name: `lisatytOmistajat.${Number(context.row.id)}.postinumero` }}
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
        controllerProps={{ name: `lisatytOmistajat.${Number(context.row.id)}.paikkakunta` }}
      />
    ),
  },
  {
    header: "Maa",
    accessorFn: ({ paikkakunta }) => paikkakunta,
    id: "maakoodi",
    meta: getDefaultColumnMeta(),
    cell: (context) => <Maa fieldArrayName="lisatytOmistajat" index={Number(context.row.id)} />,
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
      suomifiOmistajat: initialSearchResponses.suomifi.omistajat.map((o) =>
        o.userCreated
          ? mapOmistajaToOmistajaRow("kiinteistotunnus", "nimi", "jakeluosoite", "postinumero", "paikkakunta")(o)
          : o.osoitetiedotSaatu === false
          ? mapOmistajaToOmistajaRow("jakeluosoite", "postinumero", "paikkakunta")(o)
          : mapOmistajaToOmistajaRow()(o)
      ),
      muutOmistajat: initialSearchResponses.muut.omistajat.map(mapOmistajaToOmistajaRow("jakeluosoite", "postinumero", "paikkakunta")),
      lisatytOmistajat: initialSearchResponses.lisatyt.omistajat.map(
        mapOmistajaToOmistajaRow("kiinteistotunnus", "nimi", "jakeluosoite", "postinumero", "paikkakunta")
      ),
    })
  );

  const {
    handleSubmit,
    formState: { isDirty, isSubmitting },
  } = useFormReturn;
  useLeaveConfirm(!isSubmitting && isDirty);
  const { withLoadingSpinner } = useLoadingSpinner();

  const api = useApi();
  const { showErrorMessage, showSuccessMessage } = useSnackbars();
  const router = useRouter();
  const [hakutulosMaarat, setHakutulosMaarat] = useState({
    suomifi: initialSearchResponses.suomifi.hakutulosMaara,
    muut: initialSearchResponses.muut.hakutulosMaara,
  });
  const [resetKey, setResetKey] = useState(0);

  const [vahvistusInfo, setVahvistusInfo] = useState<{ ylempaan: number; alempaan: number; poistettavat: number } | null>(null);
  const [pendingSubmitData, setPendingSubmitData] = useState<KiinteistonOmistajatFormFields | null>(null);

  const doSave = useCallback(
    async (data: KiinteistonOmistajatFormFields) => {
      let apiData: TallennaKiinteistonOmistajatMutationVariables | undefined = undefined;
      try {
        apiData = mapFormDataForApi(data);
      } catch (error) {
        log.error("Virhe kiinteistötietojen muuttamisessa tallennettavaan muotoon \n", error, data);
        showErrorMessage("Lomakkeen tietoja ei pystytty muuttamaan tallennettavaan muotoon");
        return;
      }
      try {
        await api.tallennaKiinteistonOmistajat(apiData);
        // Refetch data from backend to get updated list assignments
        const suomifi = await api.haeKiinteistonOmistajat(projekti.oid, false, undefined, 0, PAGE_SIZE);
        const muut = await api.haeKiinteistonOmistajat(projekti.oid, true, undefined, 0, PAGE_SIZE, false, true);
        const lisatyt = await api.haeKiinteistonOmistajat(projekti.oid, true, undefined, 0, undefined, true);
        useFormReturn.reset({
          oid: projekti.oid,
          suomifiOmistajat: suomifi.omistajat.map(mapOmistajaToOmistajaRow()),
          muutOmistajat: muut.omistajat.map(mapOmistajaToOmistajaRow("jakeluosoite", "postinumero", "paikkakunta")),
          lisatytOmistajat: lisatyt.omistajat.map(
            mapOmistajaToOmistajaRow("kiinteistotunnus", "nimi", "jakeluosoite", "postinumero", "paikkakunta")
          ),
        });
        setHakutulosMaarat({ suomifi: suomifi.hakutulosMaara, muut: muut.hakutulosMaara });
        setResetKey((k) => k + 1);
        showSuccessMessage("Kiinteistönomistajatiedot tallennettu");
      } catch (error) {
        log.error("Virhe kiinteistötietojen tallennuksessa: \n", error, apiData);
      }
    },
    [api, projekti.oid, showErrorMessage, showSuccessMessage, useFormReturn]
  );

  const onSubmit = useCallback<SubmitHandler<KiinteistonOmistajatFormFields>>(
    (data) => {
      // Count all changes that need confirmation
      const siirtyvatYlempaan = [
        ...data.muutOmistajat.filter((o) => !o.toBeDeleted && o.jakeluosoite && o.postinumero && o.paikkakunta),
        ...data.lisatytOmistajat.filter((o) => !o.toBeDeleted && o.jakeluosoite && o.postinumero && o.paikkakunta),
      ].length;
      const siirtyvatAlempaan = data.suomifiOmistajat.filter(
        (o) => !o.toBeDeleted && !(o.jakeluosoite && o.postinumero && o.paikkakunta)
      ).length;
      const poistettavat = [
        ...data.muutOmistajat.filter((o) => o.toBeDeleted),
        ...data.suomifiOmistajat.filter((o) => o.toBeDeleted),
        ...data.lisatytOmistajat.filter((o) => o.toBeDeleted && o.id),
      ].length;

      if (siirtyvatYlempaan > 0 || siirtyvatAlempaan > 0 || poistettavat > 0) {
        setVahvistusInfo({ ylempaan: siirtyvatYlempaan, alempaan: siirtyvatAlempaan, poistettavat });
        setPendingSubmitData(data);
      } else {
        withLoadingSpinner(doSave(data));
      }
    },
    [doSave, withLoadingSpinner]
  );

  const confirmAndSave = useCallback(() => {
    setVahvistusInfo(null);
    if (pendingSubmitData) {
      withLoadingSpinner(doSave(pendingSubmitData));
      setPendingSubmitData(null);
    }
  }, [doSave, pendingSubmitData, withLoadingSpinner]);

  const loadAllMuutRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const loadAllSuomifiRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const [suodatus, setSuodatus] = useState<SuodatusState>(null);

  const handleSuodata = useCallback(
    (query: string) => {
      if (query) {
        withLoadingSpinner(
          (async () => {
            await loadAllSuomifiRef.current?.();
            await loadAllMuutRef.current?.();
            const lower = query.toLowerCase();
            const matchRow = (o: OmistajaRow) =>
              [o.nimi, o.kiinteistotunnus, o.jakeluosoite, o.postinumero, o.paikkakunta, o.maa].some((val) =>
                val?.toLowerCase().includes(lower)
              );
            const values = useFormReturn.getValues();
            const filterIndices = (rows: OmistajaRow[]) => new Set(rows.map((o, i) => (matchRow(o) ? i : -1)).filter((i) => i >= 0));
            setSuodatus({
              suomifiOmistajat: filterIndices(values.suomifiOmistajat),
              muutOmistajat: filterIndices(values.muutOmistajat),
              lisatytOmistajat: filterIndices(values.lisatytOmistajat),
            });
          })()
        );
      } else {
        setSuodatus(null);
      }
    },
    [withLoadingSpinner, useFormReturn]
  );

  const resetAndClose = useCallback(async () => {
    await router.push({ pathname: "/yllapito/projekti/[oid]/tiedottaminen/kiinteistonomistajat", query: { oid: projekti.oid } });
  }, [router, projekti.oid]);

  return (
    <SuodatusContext.Provider value={suodatus}>
      <FormProvider {...useFormReturn}>
        <DialogForm>
          <DialogContent>
            <SuodatusKentta onSuodata={handleSuodata} suodatusAktiivinen={!!suodatus} />
            <Section noDivider>
              <H3>Kiinteistönomistajien tiedotus Suomi.fi -palvelulla</H3>
              <p>
                Ilmoitus toimitetaan alle listatuille kiinteistönomistajille järjestelmän kautta kuulutuksen julkaisupäivänä.
                Kiinteistönomistajista viedään vastaanottajalista automaattisesti asianhallintaan, kun kuulutus hyväksytään julkaistavaksi.
              </p>
              {hakutulosMaarat.suomifi ? (
                <PaginatedTaulukko
                  key={`suomifi-${resetKey}`}
                  oid={projekti.oid}
                  initialHakutulosMaara={hakutulosMaarat.suomifi}
                  columns={suomifiColumns}
                  fieldArrayName="suomifiOmistajat"
                  loadAllRef={loadAllSuomifiRef}
                />
              ) : (
                <GrayBackgroundText>
                  <p>Karttarajaukseen ei osunut ainuttakaan Suomi.fi-tiedotettavaa.</p>
                </GrayBackgroundText>
              )}
            </Section>
            <Section>
              <H3>Kiinteistönomistajat, joille ei ole yhteystietoja</H3>
              <p>
                Huomaathan, että kaikkien kiinteistönomistajien tietoja ei ole mahdollista löytää järjestelmän kautta. Kiinteistönomistaja
                siirtyy Suomi.fi-palvelun kautta tiedotettaviin, kun sille lisätään osoitetiedot. Kiinteistönomistajista viedään
                vastaanottajalista automaattisesti asianhallintaan, kun kuulutus hyväksytään julkaistavaksi.
              </p>
              {initialSearchResponses.muut.hakutulosMaara ? (
                <>
                  <PaginatedTaulukko
                    oid={projekti.oid}
                    initialHakutulosMaara={initialSearchResponses.muut.hakutulosMaara}
                    columns={muutColumns}
                    fieldArrayName="muutOmistajat"
                    loadAllRef={loadAllMuutRef}
                    extraActions={<TuoExcelistaButton loadAllRef={loadAllMuutRef} />}
                  />
                </>
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
                <Button type="button" onClick={handleSubmit(onSubmit)} primary>
                  Tallenna
                </Button>
              </Stack>
            </Section>
          </DialogContent>
        </DialogForm>
        <HassuDialog
          open={vahvistusInfo !== null}
          title="Kiinteistönomistajatietojen tallentaminen"
          onClose={() => {
            setVahvistusInfo(null);
            setPendingSubmitData(null);
          }}
        >
          <DialogContent>
            {vahvistusInfo?.poistettavat ? (
              <p>{`Olet poistamassa ${vahvistusInfo.poistettavat} kiinteistönomistaja${vahvistusInfo.poistettavat === 1 ? "n" : "a"}.`}</p>
            ) : null}
            {vahvistusInfo?.ylempaan ? (
              <p>{`${vahvistusInfo.ylempaan} kiinteistönomistaja${
                vahvistusInfo.ylempaan === 1 ? "" : "a"
              } siirtyy Suomi.fi:n kautta tiedotettavaksi.`}</p>
            ) : null}
            {vahvistusInfo?.alempaan ? (
              <p>{`${vahvistusInfo.alempaan} kiinteistönomistaja${
                vahvistusInfo.alempaan === 1 ? "" : "a"
              } siirtyy kiinteistönomistajiin, joilla ei ole yhteystietoja.`}</p>
            ) : null}
          </DialogContent>
          <DialogActions>
            <Button type="button" onClick={confirmAndSave} primary>
              Jatka
            </Button>
            <Button
              type="button"
              onClick={() => {
                setVahvistusInfo(null);
                setPendingSubmitData(null);
              }}
            >
              Peruuta
            </Button>
          </DialogActions>
        </HassuDialog>
      </FormProvider>
    </SuodatusContext.Provider>
  );
};

const PaginatedTaulukko = ({
  oid,
  initialHakutulosMaara,
  columns,
  fieldArrayName,
  extraActions,
  loadAllRef,
}: {
  oid: string;
  initialHakutulosMaara: number;
  fieldArrayName: "muutOmistajat" | "suomifiOmistajat";
  columns: ColumnDef<OmistajaRow>[];
  extraActions?: React.ReactNode;
  loadAllRef?: React.MutableRefObject<(() => Promise<void>) | undefined>;
}) => {
  const {
    control,
    reset,
    formState: { isDirty },
  } = useFormContext<KiinteistonOmistajatFormFields>();
  const [hakutulosMaara, setHakutulosMaara] = useState<number>(initialHakutulosMaara);
  const [sliceAt, setSliceAt] = useState(PAGE_SIZE);
  const { append: appendMuut, fields } = useFieldArray({ control, name: fieldArrayName, keyName: "fieldId" });
  const suodatus = useContext(SuodatusContext);
  const filteredFields = useMemo(() => {
    const indices = suodatus?.[fieldArrayName];
    if (!indices) return fields;
    return fields.filter((_, i) => indices.has(i));
  }, [fields, suodatus, fieldArrayName]);
  const slicedFields = useMemo(() => (suodatus ? filteredFields : filteredFields.slice(0, sliceAt)), [filteredFields, sliceAt, suodatus]);

  const getRowId = useCallback(
    (_row: OmistajaRow, index: number) => {
      if (!suodatus?.[fieldArrayName]) return String(index);
      const indices = Array.from(suodatus[fieldArrayName]!).sort((a, b) => a - b);
      return String(indices[index]);
    },
    [suodatus, fieldArrayName]
  );

  const api = useApi();
  const { withLoadingSpinner } = useLoadingSpinner();

  const updateMuut = useCallback(
    async (from: number, size: number) => {
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
    },
    [api, appendMuut, fieldArrayName, fields, oid, isDirty, reset]
  );

  if (loadAllRef) {
    loadAllRef.current = async () => {
      if (fields.length < hakutulosMaara) {
        const prevSliceAt = sliceAt;
        await updateMuut(fields.length, hakutulosMaara - fields.length);
        setSliceAt(prevSliceAt);
      }
    };
  }

  const showLess = useCallback(() => {
    setSliceAt((old) => old - PAGE_SIZE);
  }, []);

  const getNextPage = useCallback(() => {
    if (fields.length > slicedFields.length) {
      setSliceAt((old) => old + PAGE_SIZE);
    } else {
      withLoadingSpinner(updateMuut(slicedFields.length, PAGE_SIZE));
    }
  }, [fields.length, slicedFields.length, updateMuut, withLoadingSpinner]);

  const toggleShowHideAll = useCallback(() => {
    if (slicedFields.length < (hakutulosMaara ?? 0)) {
      if (fields.length >= hakutulosMaara) {
        setSliceAt(hakutulosMaara);
      } else {
        withLoadingSpinner(updateMuut(fields.length, (hakutulosMaara ?? 0) - fields.length));
      }
    } else {
      setSliceAt(PAGE_SIZE);
    }
  }, [hakutulosMaara, slicedFields.length, fields.length, updateMuut, withLoadingSpinner]);

  const table = useReactTable({
    columns: columns,
    getCoreRowModel: getCoreRowModel(),
    data: slicedFields,
    enableSorting: false,
    defaultColumn: { cell: (cell) => cell.getValue() || "-" },
    state: { pagination: undefined },

    getRowId,
  });

  return (
    <>
      <HassuTable table={table} />
      {!suodatus && (
        <Stack direction="row" alignItems="flex-start">
          <Stack alignItems="center" flex={1}>
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
          {extraActions}
        </Stack>
      )}
    </>
  );
};

const LisatytTaulukko = () => {
  const { control } = useFormContext<KiinteistonOmistajatFormFields>();
  const { append, fields } = useFieldArray({ control, name: "lisatytOmistajat", keyName: "fieldId" });
  const suodatus = useContext(SuodatusContext);
  const filteredFields = useMemo(() => {
    const indices = suodatus?.lisatytOmistajat;
    if (!indices) return fields;
    return fields.filter((_, i) => indices.has(i));
  }, [fields, suodatus]);

  const getRowId = useCallback(
    (_row: OmistajaRow, index: number) => {
      if (!suodatus?.lisatytOmistajat) return String(index);
      const indices = Array.from(suodatus.lisatytOmistajat).sort((a, b) => a - b);
      return String(indices[index]);
    },
    [suodatus]
  );

  const table = useReactTable({
    columns: lisatytColumns,
    getCoreRowModel: getCoreRowModel(),
    data: filteredFields,
    enableSorting: false,
    defaultColumn: { cell: (cell) => cell.getValue() || "-" },
    state: { pagination: undefined },
    getRowId,
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

// Excel column headers shared with export (tiedotettavatExcel.ts)
const TuoExcelistaButton: FunctionComponent<{ loadAllRef: React.MutableRefObject<(() => Promise<void>) | undefined> }> = ({
  loadAllRef,
}) => {
  const { getValues, setValue } = useFormContext<KiinteistonOmistajatFormFields>();
  const { showErrorMessage, showSuccessMessage } = useSnackbars();
  const { withLoadingSpinner } = useLoadingSpinner();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }
      withLoadingSpinner(
        (async () => {
          try {
            const sheetNames = await readSheetNames(file);
            const sheetIndex = getSheetIndexToRead(sheetNames);
            const rows = await readXlsxFile(file, { sheet: sheetIndex });
            const columns = findColumnIndices(rows);
            if (!columns || columns.kiinteistotunnus < 0 || columns.nimi < 0) {
              showErrorMessage("Excel-tiedostosta ei löytynyt tunnistettavia otsikoita (Kiinteistötunnus, Omistajan nimi).");
              return;
            }
            if (columns.postiosoite < 0 && columns.postinumero < 0 && columns.postitoimipaikka < 0) {
              showErrorMessage("Excel-tiedostosta ei löytynyt osoitesarakkeita (Postiosoite, Postinumero, Postitoimipaikka).");
              return;
            }
            // Load all rows from backend before matching
            await loadAllRef.current?.();
            const muutOmistajat = getValues("muutOmistajat");
            const { results, errors } = matchExcelRowsToOmistajat(rows, columns, muutOmistajat);

            const errorIndices = new Set(errors.map((e) => e.omistajaIndex));

            let updatedCount = 0;
            for (const result of results) {
              if (errorIndices.has(result.index)) {
                continue;
              }
              const current = muutOmistajat[result.index];
              let changed = false;
              if (result.jakeluosoite !== (current.jakeluosoite ?? "")) {
                setValue(`muutOmistajat.${result.index}.jakeluosoite`, result.jakeluosoite, { shouldDirty: true });
                changed = true;
              }
              if (result.postinumero !== (current.postinumero ?? "")) {
                setValue(`muutOmistajat.${result.index}.postinumero`, result.postinumero, { shouldDirty: true });
                changed = true;
              }
              if (result.paikkakunta !== (current.paikkakunta ?? "")) {
                setValue(`muutOmistajat.${result.index}.paikkakunta`, result.paikkakunta, { shouldDirty: true });
                changed = true;
              }
              if (result.maakoodi !== null && result.maakoodi !== (current.maakoodi ?? "")) {
                setValue(`muutOmistajat.${result.index}.maakoodi`, result.maakoodi, { shouldDirty: true });
                changed = true;
              }
              if (changed) updatedCount++;
            }

            if (updatedCount > 0) {
              showSuccessMessage(`Osoitetiedot päivitetty ${updatedCount} kiinteistönomistajalle. Muista tallentaa muutokset.`);
            } else if (errors.length === 0) {
              showSuccessMessage("Excelistä ei löytynyt päivitettäviä osoitetietoja.");
            }
            if (errors.length > 0) {
              const tunnistamattomat = errors.map((e) => `"${e.value}" (rivi ${e.rowIndex})`).join(", ");
              showErrorMessage(
                `${errors.length} ${errors.length === 1 ? "rivi" : "riviä"} ohitettu tunnistamattoman maan vuoksi: ${tunnistamattomat}`
              );
            }
          } catch (e) {
            log.error("Excel-tiedoston lukeminen epäonnistui", e);
            showErrorMessage("Excel-tiedoston lukeminen epäonnistui.");
          }
          // Reset file input so same file can be selected again
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        })()
      );
    },
    [getValues, setValue, showErrorMessage, showSuccessMessage, loadAllRef, withLoadingSpinner]
  );

  return (
    <>
      <input ref={fileInputRef} type="file" accept=".xlsx" onChange={handleFileChange} style={{ display: "none" }} />
      <Button type="button" onClick={() => fileInputRef.current?.click()}>
        Tuo Excelistä
      </Button>
    </>
  );
};

const SuodatusKentta: FunctionComponent<{ onSuodata: (query: string) => void; suodatusAktiivinen: boolean }> = ({
  onSuodata,
  suodatusAktiivinen,
}) => {
  const [query, setQuery] = useState("");

  const handleReset = useCallback(() => {
    setQuery("");
    onSuodata("");
  }, [onSuodata]);

  return (
    <Section noDivider>
      <Stack direction="row" alignItems="end" spacing={2}>
        <TextField
          sx={{ flexGrow: 1, label: { fontWeight: 700, fontSize: "1.25rem" } }}
          label="Suodata kiinteistönomistajia"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSuodata(query);
            }
          }}
          size="small"
        />
        <Button primary type="button" onClick={() => onSuodata(query)} endIcon="search">
          Suodata
        </Button>
      </Stack>
      {suodatusAktiivinen && (
        <ButtonFlat onClick={handleReset} type="button">
          Nollaa suodatus
        </ButtonFlat>
      )}
    </Section>
  );
};
