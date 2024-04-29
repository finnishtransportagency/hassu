import React, { useCallback, useState, VFC, useMemo } from "react";
import { Autocomplete, DialogContent, Stack, styled, TextField } from "@mui/material";
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
  ({ id, sukunimi, nimi, paikkakunta, postinumero, maa, maakoodi, tiedotusosoite, etunimi, tiedotustapa }: Muistuttaja): MuistuttajaRow => {
    const omistajaRow: MuistuttajaRow = {
      id,
      nimi: nimi ? nimi : [etunimi, sukunimi].filter((nimi) => !!nimi).join(" "),
      tiedotusosoite,
      postinumero,
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

type PoistettavaOmistaja = Omit<MuistuttajaRow, "id"> & { id: string };

const mapFormDataForApi: (data: MuistuttajatFormFields) => TallennaMuistuttajatMutationVariables = (data) => {
  const poistettavatMuistuttajat = [...data.muutMuistuttajat, ...data.suomifiMuistuttajat]
    .filter((omistaja): omistaja is PoistettavaOmistaja => !!omistaja.toBeDeleted && !!omistaja.id)
    .map(({ id }) => id);
  const muutMuistuttajat = data.muutMuistuttajat
    .filter((omistaja) => !omistaja.toBeDeleted)
    .map<MuistuttajaInput>(({ id, maakoodi, nimi, paikkakunta, postinumero, sahkoposti, tiedotusosoite, tiedotustapa }) => ({
      id,
      sahkoposti,
      tiedotusosoite,
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

const getDefaultColumnMeta = () => ({
  widthFractions: 3,
  minWidth: 200,
});

const createPoistaColumn = (
  fieldArrayName: "suomifiOmistajat" | "muutOmistajat" | "lisatytOmistajat"
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

const muutColumns: ColumnDef<MuistuttajaRow>[] = [
  {
    header: "Kiinteistötunnus",
    id: "kiinteistotunnus",
    accessorKey: "kiinteistotunnus",
    meta: getDefaultColumnMeta(),
  },
  {
    header: "Muistuttajan nimi",
    accessorKey: "nimi",
    id: "muistuttajan_nimi",
    meta: getDefaultColumnMeta(),
  },
  {
    header: "Postiosoite",
    accessorKey: "jakeluosoite",
    id: "postiosoite",
    meta: getDefaultColumnMeta(),
    cell: (context) => (
      <TextFieldWithController<MuistuttajatFormFields>
        autoComplete="off"
        fullWidth
        controllerProps={{ name: `muutMuistuttajat.${context.row.index}.tiedotusosoite` }}
      />
    ),
  },
  {
    header: "Postinumero",
    accessorKey: "postinumero",
    id: "postinumero",
    meta: getDefaultColumnMeta(),
    cell: (context) => (
      <TextFieldWithController<MuistuttajatFormFields>
        autoComplete="off"
        fullWidth
        controllerProps={{ name: `muutMuistuttajat.${context.row.index}.postinumero` }}
      />
    ),
  },
  {
    header: "Postitoimipaikka",
    accessorFn: ({ paikkakunta }) => paikkakunta,
    id: "postitoimipaikka",
    meta: getDefaultColumnMeta(),
    cell: (context) => (
      <TextFieldWithController<MuistuttajatFormFields>
        autoComplete="off"
        fullWidth
        controllerProps={{ name: `muutMuistuttajat.${context.row.index}.paikkakunta` }}
      />
    ),
  },
  {
    header: "Maa",
    accessorFn: ({ paikkakunta }) => paikkakunta,
    id: "maakoodi",
    meta: getDefaultColumnMeta(),
    cell: (context) => <Maa fieldArrayName="muutMuistuttajat" index={context.row.index} />,
  },
  createPoistaColumn("muutOmistajat"),
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
        mapOmistajaToMuistuttajaRow("nimi", "tiedotusosoite", "postinumero", "paikkakunta", "sahkoposti", "tiedotustapa")
      ),
    })
  );

  const { handleSubmit } = useFormReturn;
  const { withLoadingSpinner } = useLoadingSpinner();

  const api = useApi();
  const { showErrorMessage, showSuccessMessage } = useSnackbars();
  const router = useRouter();

  const onSubmit = useCallback<SubmitHandler<MuistuttajatFormFields>>(
    (data) => {
      withLoadingSpinner(
        (async () => {
          let apiData: TallennaMuistuttajatMutationVariables | undefined = undefined;
          try {
            apiData = mapFormDataForApi(data);
          } catch (error) {
            log.error("Virhe muistuttajatietojen muuttamisessa tallennettavaan muotoon \n", error, data);
            showErrorMessage("Lomakkeen tietoja ei pystytty muuttamaan tallennettavaan muotoon");
          }
          if (apiData) {
            try {
              await api.tallennaMuistuttajat(apiData);
              useFormReturn.reset(data);
              close();
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
    router.back();
  }, [router]);

  return (
    <FormProvider {...useFormReturn}>
      <DialogForm>
        <DialogContent>
          <Section noDivider>
            <H3>Muistuttajien tiedotus Suomi.fi -palvelulla</H3>
            <p>
              Tällä listalla oleville henkilöille lähetetään automaattisesti tieto hyväksymispäätöksen kuulutuksesta Suomi.fi-palvelun
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
  );
};

const SuomifiTaulukko = ({ oid, initialHakutulosMaara }: { oid: string; initialHakutulosMaara: number }) => {
  const { control } = useFormContext<MuistuttajatFormFields>();
  const [hakutulosMaara, setHakutulosMaara] = useState<number>(initialHakutulosMaara);
  const [sliceAt, setSliceAt] = useState(PAGE_SIZE);
  const { append: appendMuut, fields } = useFieldArray({ control, name: "suomifiMuistuttajat", keyName: "fieldId" });
  const slicedFields = useMemo(() => fields.slice(0, sliceAt), [fields, sliceAt]);

  const api = useApi();
  const { withLoadingSpinner } = useLoadingSpinner();

  const updateMuut = useCallback<(from: number, size: number) => void>(
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
            appendMuut(toBeAdded);
          } catch {}
        })()
      );
    },
    [api, appendMuut, fields, oid, withLoadingSpinner]
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
            tiedotusosoite: "",
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
