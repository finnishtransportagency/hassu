import React, { useCallback, useState, VFC, useMemo } from "react";
import { Autocomplete, DialogActions, DialogContent, Stack, styled, TextField } from "@mui/material";
import Button from "@components/button/Button";
import Section from "@components/layout/Section2";
import { H3 } from "@components/Headings";
import { Muistuttaja, MuistuttajaInput, Muistuttajat, TallennaMuistuttajatMutationVariables } from "@services/api";
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
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import useApi from "src/hooks/useApi";
import { ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table";
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

type MuistuttajaRow = Omit<MuistuttajaInput, "maakoodi"> & {
  toBeDeleted: boolean;
  maakoodi: string | null;
  maa: string | null | undefined;
};

type MuistuttajatFormFields = {
  oid: string;
  suomifiMuistuttajat: MuistuttajaRow[];
  muutMuistuttajat: MuistuttajaRow[];
};

const PAGE_SIZE = 25;

const mapOmistajaToMuistuttajaRow =
  (...fieldsToSetDefaultsTo: (keyof MuistuttajaInput)[]) =>
  ({ id, nimi, paikkakunta, jakeluosoite, postinumero, maa, maakoodi, sahkoposti, tiedotustapa }: Muistuttaja): MuistuttajaRow => {
    const omistajaRow: MuistuttajaRow = {
      id,
      nimi,
      sahkoposti,
      postinumero,
      jakeluosoite,
      maakoodi: maakoodi ?? null,
      paikkakunta,
      tiedotustapa,
      toBeDeleted: false,
      maa,
    };
    fieldsToSetDefaultsTo.forEach((key) => {
      omistajaRow[key] = omistajaRow[key] ?? "";
    });
    return omistajaRow;
  };

type PoistettavaMuistuttaja = Omit<MuistuttajaRow, "id"> & { id: string };

const mapFormDataForApi: (data: MuistuttajatFormFields) => TallennaMuistuttajatMutationVariables = (data) => {
  const poistettavatMuistuttajat = [...data.muutMuistuttajat, ...data.suomifiMuistuttajat]
    .filter((omistaja): omistaja is PoistettavaMuistuttaja => !!omistaja.toBeDeleted && !!omistaja.id)
    .map(({ id }) => id);
  const muutMuistuttajat = data.muutMuistuttajat
    .filter((omistaja) => !omistaja.toBeDeleted)
    .map<MuistuttajaInput>(({ id, maakoodi, nimi, paikkakunta, postinumero, sahkoposti, jakeluosoite, tiedotustapa }) => ({
      id,
      sahkoposti,
      jakeluosoite,
      tiedotustapa,
      nimi,
      paikkakunta,
      postinumero,
      maakoodi,
    }));
  const variables: TallennaMuistuttajatMutationVariables = {
    oid: data.oid,
    muutMuistuttajat,
    poistettavatMuistuttajat,
  };

  return variables;
};

const getFormOptions: (defaultValues: MuistuttajatFormFields) => UseFormProps<MuistuttajatFormFields> = (defaultValues) => ({
  mode: "onChange",
  reValidateMode: "onChange",
  defaultValues,
  shouldUnregister: false,
});

const getSuomifiDefaultColumnMeta = () => ({
  widthFractions: 4,
  minWidth: 200,
});

const getDefaultColumnMeta = () => ({
  widthFractions: 3,
  minWidth: 140,
});

const createPoistaColumn = (
  fieldArrayName: "suomifiMuistuttajat" | "muutMuistuttajat" | "lisatytMuistuttajat"
): ColumnDef<MuistuttajaRow, unknown> => ({
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

const suomifiColumns: ColumnDef<MuistuttajaRow>[] = [
  {
    header: "Muistuttajan nimi",
    accessorKey: "nimi",
    id: "muistuttajan_nimi",
    meta: { minWidth: 200, widthFractions: 5 },
  },
  {
    header: "Postiosoite",
    accessorKey: "jakeluosoite",
    id: "postiosoite",
    meta: getSuomifiDefaultColumnMeta(),
  },
  {
    header: "Postinumero",
    accessorKey: "postinumero",
    id: "postinumero",
    meta: getSuomifiDefaultColumnMeta(),
  },
  {
    header: "Postitoimipaikka",
    accessorKey: "paikkakunta",
    id: "postitoimipaikka",
    meta: getSuomifiDefaultColumnMeta(),
  },
  {
    header: "Maa",
    accessorFn: ({ maakoodi }) => getLocalizedCountryName("fi", maakoodi ?? "FI"),
    id: "maakoodi",
    meta: getSuomifiDefaultColumnMeta(),
  },
];

const muutColumns: ColumnDef<MuistuttajaRow>[] = [
  {
    header: "Muistuttajan nimi",
    id: "muistuttajan_nimi",
    meta: getDefaultColumnMeta(),
    cell: (context) => (
      <TextFieldWithController<MuistuttajatFormFields>
        autoComplete="off"
        fullWidth
        controllerProps={{ name: `muutMuistuttajat.${context.row.index}.nimi` }}
        sx={{ "& .MuiInputBase-root": { minWidth: "120px" } }}
      />
    ),
  },
  {
    header: "Postiosoite",
    id: "postiosoite",
    meta: getDefaultColumnMeta(),
    cell: (context) => (
      <TextFieldWithController<MuistuttajatFormFields>
        autoComplete="off"
        fullWidth
        controllerProps={{ name: `muutMuistuttajat.${context.row.index}.jakeluosoite` }}
        sx={{ "& .MuiInputBase-root": { minWidth: "120px" } }}
      />
    ),
  },
  {
    header: "Postinumero",
    id: "postinumero",
    meta: getDefaultColumnMeta(),
    cell: (context) => (
      <TextFieldWithController<MuistuttajatFormFields>
        autoComplete="off"
        fullWidth
        controllerProps={{ name: `muutMuistuttajat.${context.row.index}.postinumero` }}
        sx={{ "& .MuiInputBase-root": { minWidth: "120px" } }}
      />
    ),
  },
  {
    header: "Postitoimipaikka",
    id: "postitoimipaikka",
    meta: getDefaultColumnMeta(),
    cell: (context) => (
      <TextFieldWithController<MuistuttajatFormFields>
        autoComplete="off"
        fullWidth
        controllerProps={{ name: `muutMuistuttajat.${context.row.index}.paikkakunta` }}
        sx={{ "& .MuiInputBase-root": { minWidth: "120px" } }}
      />
    ),
  },
  {
    header: "Maa",
    id: "maakoodi",
    meta: getDefaultColumnMeta(),
    cell: (context) => <Maa fieldArrayName="muutMuistuttajat" index={context.row.index} />,
  },
  {
    header: "Sähkoposti",
    id: "sahkoposti",
    meta: getDefaultColumnMeta(),
    cell: (context) => (
      <TextFieldWithController<MuistuttajatFormFields>
        autoComplete="off"
        fullWidth
        controllerProps={{ name: `muutMuistuttajat.${context.row.index}.sahkoposti` }}
        sx={{ "& .MuiInputBase-root": { minWidth: "120px" } }}
      />
    ),
  },
  {
    header: "Tiedotustapa",
    id: "tiedotustapa",
    meta: getDefaultColumnMeta(),
    cell: (context) => (
      <TextFieldWithController<MuistuttajatFormFields>
        autoComplete="off"
        fullWidth
        controllerProps={{ name: `muutMuistuttajat.${context.row.index}.tiedotustapa` }}
        sx={{ "& .MuiInputBase-root": { minWidth: "120px" } }}
      />
    ),
  },
  createPoistaColumn("muutMuistuttajat"),
];

const countryCodesSorted = lookup.countries
  .map((country) => country.iso2)
  .sort((codeA, codeB) => {
    const nameA = getLocalizedCountryName("fi", codeA);
    const nameB = getLocalizedCountryName("fi", codeB);
    return nameA.localeCompare(nameB);
  });

const Maa = ({ fieldArrayName, index }: { fieldArrayName: "suomifiMuistuttajat" | "muutMuistuttajat"; index: number }) => {
  const { control } = useFormContext<MuistuttajatFormFields>();

  const {
    field: { ref, onChange, onBlur, name, value },
  } = useController({ name: `${fieldArrayName}.${index}.maakoodi`, control });

  const [inputValue, setInputValue] = React.useState("");

  return (
    <Autocomplete
      options={countryCodesSorted}
      renderInput={({ inputProps = {}, ...params }) => (
        <TextField
          {...params}
          sx={{ "& .MuiInputBase-root": { minWidth: "120px" } }}
          name={name}
          inputProps={{ ref, ...inputProps }}
          required
        />
      )}
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
  suomifi: Muistuttajat;
  muut: Muistuttajat;
};

export const FormContents: VFC<{
  projekti: ProjektiLisatiedolla;
  initialSearchResponses: InitialSearchResponses;
}> = ({ projekti, initialSearchResponses }) => {
  const useFormReturn = useForm<MuistuttajatFormFields>(
    getFormOptions({
      oid: projekti.oid,
      suomifiMuistuttajat: initialSearchResponses.suomifi.muistuttajat.map(mapOmistajaToMuistuttajaRow()),
      muutMuistuttajat: initialSearchResponses.muut.muistuttajat.map(
        mapOmistajaToMuistuttajaRow("nimi", "jakeluosoite", "postinumero", "paikkakunta", "sahkoposti", "tiedotustapa")
      ),
    })
  );

  const {
    handleSubmit,
    getValues,
    formState: { isDirty },
  } = useFormReturn;
  useLeaveConfirm(isDirty);
  const { withLoadingSpinner } = useLoadingSpinner();

  function getRemoveCount() {
    return getValues().muutMuistuttajat.filter((m) => m.toBeDeleted && m.id).length;
  }
  const api = useApi();
  const { showErrorMessage, showSuccessMessage } = useSnackbars();
  const router = useRouter();
  const [poistaDialogOpen, setPoistaDialogOpen] = useState(false);
  const onSubmit = useCallback<SubmitHandler<MuistuttajatFormFields>>(
    (data) => {
      withLoadingSpinner(
        (async () => {
          setPoistaDialogOpen(false);
          let apiData: TallennaMuistuttajatMutationVariables | undefined = undefined;
          try {
            apiData = mapFormDataForApi(data);
          } catch (error) {
            log.error("Virhe muistuttajatietojen muuttamisessa tallennettavaan muotoon \n", error, data);
            showErrorMessage("Lomakkeen tietoja ei pystytty muuttamaan tallennettavaan muotoon");
          }
          if (apiData) {
            try {
              const ids = await api.tallennaMuistuttajat(apiData);
              const newData: MuistuttajatFormFields = {
                oid: data.oid,
                suomifiMuistuttajat: data.suomifiMuistuttajat.filter((m) => !apiData?.poistettavatMuistuttajat.includes(m.id ?? "")),
                muutMuistuttajat: data.muutMuistuttajat.filter((m) => !apiData?.poistettavatMuistuttajat.includes(m.id ?? "")),
              };
              for (let i = 0; i < ids.length; i++) {
                if (!newData.muutMuistuttajat[i].id) {
                  newData.muutMuistuttajat[i].id = ids[i];
                }
              }
              // poistetaan uusi lisätty mutta merkitty poistetuksi
              newData.muutMuistuttajat = newData.muutMuistuttajat.filter((m) => !(!m.id && m.toBeDeleted));
              useFormReturn.reset(newData);
              showSuccessMessage("Muistuttajatiedot tallennettu");
            } catch (error) {
              log.error("Virhe muistuttajatietojen tallennuksessa: \n", error, apiData);
            }
          }
        })()
      );
    },
    [api, showErrorMessage, showSuccessMessage, useFormReturn, withLoadingSpinner]
  );

  const resetAndClose = useCallback(() => {
    router.push({ pathname: "/yllapito/projekti/[oid]/tiedottaminen/muistuttajat", query: { oid: projekti.oid } });
  }, [router, projekti.oid]);

  return (
    <FormProvider {...useFormReturn}>
      <DialogForm>
        <DialogContent>
          <Section noDivider>
            <H3>Muistuttajien tiedotus Suomi.fi -palvelulla</H3>
            <p>
              Tällä listalla oleville henkilöille lähetetään automaattisesti ilmoitus hyväksymispäätöksen kuulutuksesta Suomi.fi-palvelun
              kautta. Muistuttajista viedään vastaanottajalista automaattisesti asianhallintaan, kun kuulutus hyväksytään julkaistavaksi.
            </p>
            {initialSearchResponses.suomifi.hakutulosMaara ? (
              <SuomifiTaulukko oid={projekti.oid} initialHakutulosMaara={initialSearchResponses.suomifi.hakutulosMaara} />
            ) : (
              <GrayBackgroundText>
                <p>Suunnitelmaan ei ole lähetetty muistutuksia tunnistautuneena.</p>
              </GrayBackgroundText>
            )}
          </Section>
          <Section>
            <H3>Muistuttajien tiedotus muilla tavoin</H3>
            <p>
              Muistutuksen suunnitelmaan on mahdollista jättää myös kirjaamon sähköpostiin, joten on mahdollista, etteivät kaikki
              muistuttajat ole tunnistautuneet. Voit listata alle nämä muistuttajat ja tiedottaa heitä hyväksymispäätöksestä järjestelmän
              ulkopuolella. Muistuttajista viedään vastaanottajalista automaattisesti asianhallintaan, kun kuulutus hyväksytään
              julkaistavaksi.
            </p>
            <MuutTaulukko />
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
      <HassuDialog open={poistaDialogOpen} title="Muistuttajatietojen tallentaminen" onClose={() => setPoistaDialogOpen(false)}>
        <DialogContent>
          <p>{`Olet poistamassa ${getRemoveCount()} määrä muistuttajia. Tallenna vahvistaaksesi.`}</p>
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

const SuomifiTaulukko = ({ oid, initialHakutulosMaara }: { oid: string; initialHakutulosMaara: number }) => {
  const { control } = useFormContext<MuistuttajatFormFields>();
  const [hakutulosMaara, setHakutulosMaara] = useState<number>(initialHakutulosMaara);
  const [sliceAt, setSliceAt] = useState(PAGE_SIZE);
  const { append, fields } = useFieldArray({ control, name: "suomifiMuistuttajat", keyName: "fieldId" });
  const slicedFields = useMemo(() => fields.slice(0, sliceAt), [fields, sliceAt]);

  const api = useApi();
  const { withLoadingSpinner } = useLoadingSpinner();

  const updateSuomiMuistuttajat = useCallback<(from: number, size: number) => void>(
    (from, size) => {
      withLoadingSpinner(
        (async () => {
          try {
            const response = await api.haeMuistuttajat(oid, false, undefined, from, size);
            setHakutulosMaara(response.hakutulosMaara);
            const muistuttaja = response.muistuttajat;
            const toBeAdded = muistuttaja
              .filter((omistaja) => !fields.some(({ id }) => id === omistaja.id))
              .map(mapOmistajaToMuistuttajaRow());
            setSliceAt(Math.ceil((from + size) / PAGE_SIZE) * PAGE_SIZE);
            append(toBeAdded);
          } catch {}
        })()
      );
    },
    [api, append, fields, oid, withLoadingSpinner]
  );

  const showLess = useCallback(() => {
    setSliceAt((old) => old - PAGE_SIZE);
  }, []);

  const getNextPage = useCallback(() => {
    updateSuomiMuistuttajat(slicedFields.length, PAGE_SIZE);
  }, [slicedFields.length, updateSuomiMuistuttajat]);

  const toggleShowHideAll = useCallback(() => {
    if (slicedFields.length < (hakutulosMaara ?? 0)) {
      updateSuomiMuistuttajat(slicedFields.length, (hakutulosMaara ?? 0) - slicedFields.length);
    } else {
      setSliceAt(PAGE_SIZE);
    }
  }, [hakutulosMaara, slicedFields.length, updateSuomiMuistuttajat]);

  const table = useReactTable({
    columns: suomifiColumns,
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
            Näytä vähemmän muistuttajia
          </RectangleButton>
        )}
        {hakutulosMaara > slicedFields.length && (
          <RectangleButton type="button" onClick={getNextPage}>
            Näytä enemmän muistuttajia
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

const MuutTaulukko = () => {
  const { control } = useFormContext<MuistuttajatFormFields>();
  const { append, fields } = useFieldArray({ control, name: "muutMuistuttajat", keyName: "fieldId" });

  const table = useReactTable({
    columns: muutColumns,
    getCoreRowModel: getCoreRowModel(),
    data: fields,
    enableSorting: false,
    defaultColumn: { cell: (cell) => cell.getValue() || "-" },
    state: { pagination: undefined },
  });

  return (
    <>
      {!!fields.length ? (
        <HassuTable table={table} />
      ) : (
        <GrayBackgroundText>
          <p>Suunnitelmaan ei ole lähetetty muistutuksia muilla tavoin.</p>
        </GrayBackgroundText>
      )}
      <Button
        type="button"
        onClick={() => {
          append({
            nimi: "",
            jakeluosoite: "",
            sahkoposti: "",
            tiedotustapa: "",
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
