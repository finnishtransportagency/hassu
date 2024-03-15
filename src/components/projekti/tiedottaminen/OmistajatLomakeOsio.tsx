import React, { useCallback, useMemo, useState, VFC } from "react";
import TiedotettavaHaitari, { TiedotettavaHaitariProps } from "@components/projekti/tiedottaminen/TiedotettavaHaitari";
import useApi from "src/hooks/useApi";
import { Controller, useFieldArray, UseFieldArrayProps, UseFieldArrayRemove, useFormContext, UseFormRegister } from "react-hook-form";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import { OmistajaRow, FormData, PAGE_SIZE } from "../../../pages/yllapito/projekti/[oid]/tiedottaminen/kiinteistonomistajat.dev";
import { ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { formatKiinteistotunnus } from "common/util/formatKiinteistotunnus";
import { Checkbox, TextField } from "@mui/material";
import debounce from "lodash/debounce";
import { H4 } from "@components/Headings";
import HassuTable from "@components/table/HassuTable";
import Button from "@components/button/Button";
import IconButton from "@components/button/IconButton";

type FieldArrayName = UseFieldArrayProps<FormData>["name"];

type OmistajatLomakeOsioProps = {
  oid: string;
  expanded: boolean;
  setExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  muutOmistajat?: boolean;
  title: string;
  instructionText: string | JSX.Element;
  fieldArrayName: "suomifiOmistajat" | "muutOmistajat";
  queryFieldName: "muutOmistajatQuery" | "suomifiOmistajatQuery";
};

const createColumns: (
  fieldArrayName: FieldArrayName | "uudetOmistajat",
  register: UseFormRegister<FormData>,
  removeUusiOmistaja?: UseFieldArrayRemove
) => ColumnDef<OmistajaRow>[] = (fieldArrayName, register, removeUusiOmistaja) => [
  createKiinteistotunnusColumn(register, fieldArrayName),
  createNimiColumn(register, fieldArrayName),
  createPostiosoiteColumn(register, fieldArrayName),
  createPostinumeroColumn(register, fieldArrayName),
  createPostitoimipaikkaColumn(register, fieldArrayName),
  createPoistaColumn(fieldArrayName, removeUusiOmistaja),
];

export const OmistajatLomakeOsio: VFC<OmistajatLomakeOsioProps> = ({
  oid,
  expanded,
  setExpanded,
  instructionText,
  muutOmistajat = false,
  title,
  fieldArrayName,
  queryFieldName,
}) => {
  const api = useApi();
  const [queryResettable, setQueryResettable] = useState<boolean>(false);
  const [hakutulosMaara, setHakutulosMaara] = useState<number | null>(null);
  const [naytettavatOmistajat, setNaytettavatOmistajat] = useState<OmistajaRow[] | null>(null);
  const { watch, control, register, setValue } = useFormContext<FormData>();
  const { append } = useFieldArray({ control, name: fieldArrayName });

  const { withLoadingSpinner } = useLoadingSpinner();

  const updateTiedotettavat = useCallback<(query?: string, from?: number, size?: number) => void>(
    (query?: string, from = naytettavatOmistajat?.length ?? 0, size = PAGE_SIZE) => {
      withLoadingSpinner(
        (async () => {
          try {
            const response = await api.haeKiinteistonOmistajat(oid, muutOmistajat, query, from, size);
            setQueryResettable(query !== undefined);
            setHakutulosMaara(response.hakutulosMaara);
            const omistajatOnForm = watch(fieldArrayName);
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
            append(lisattavat);
            setNaytettavatOmistajat((oldOmistajat) => [...(oldOmistajat ?? []), ...omistajat]);
          } catch {}
        })()
      );
    },
    [naytettavatOmistajat?.length, withLoadingSpinner, api, oid, muutOmistajat, watch, fieldArrayName, append]
  );

  const handleExpansionChange = useCallback(
    (_event: React.SyntheticEvent, isExpanded: boolean) => {
      if (isExpanded) {
        updateTiedotettavat();
      } else {
        setNaytettavatOmistajat(null);
        setHakutulosMaara(null);
        setValue(queryFieldName, "");
        setQueryResettable(false);
      }
      setExpanded(isExpanded);
    },
    [queryFieldName, setExpanded, setValue, updateTiedotettavat]
  );

  const columns = useMemo(() => createColumns(fieldArrayName, register), [fieldArrayName, register]);

  if (fieldArrayName === "suomifiOmistajat") {
    return (
      <TiedotettavaHaitari
        expanded={expanded}
        onChange={handleExpansionChange}
        hakutulosMaara={hakutulosMaara}
        updateTiedotettavat={updateTiedotettavat}
        columns={columns}
        queryResettable={queryResettable}
        setTiedotettavat={setNaytettavatOmistajat}
        tiedotettavat={naytettavatOmistajat}
        oid={oid}
        filterText="Suodata kiinteistönomistajia"
        title={title}
        instructionText={instructionText}
        queryFieldName={queryFieldName}
      />
    );
  }

  return (
    <MuutOmistajatHaitari
      expanded={expanded}
      onChange={handleExpansionChange}
      hakutulosMaara={hakutulosMaara}
      updateTiedotettavat={updateTiedotettavat}
      columns={columns}
      queryResettable={queryResettable}
      setTiedotettavat={setNaytettavatOmistajat}
      tiedotettavat={naytettavatOmistajat}
      oid={oid}
      filterText="Suodata kiinteistönomistajia"
      title={title}
      instructionText={instructionText}
      queryFieldName={queryFieldName}
    />
  );
};

const MuutOmistajatHaitari: VFC<TiedotettavaHaitariProps<OmistajaRow>> = ({
  expanded,
  onChange,
  hakutulosMaara,
  updateTiedotettavat,
  columns,
  queryResettable,
  setTiedotettavat,
  tiedotettavat,
  oid,
  filterText,
  title,
  instructionText,
  queryFieldName,
}) => {
  const { control, register } = useFormContext<FormData>();
  const { append, fields, remove: removeUusiOmistaja } = useFieldArray({ control, name: "uudetOmistajat" });

  const appendNewRow = useCallback(() => {
    append({ kiinteistotunnus: "", nimi: "", jakeluosoite: "", postinumero: "", paikkakunta: "" });
  }, [append]);

  const uudetOmistajatColumns = useMemo(
    () => createColumns("uudetOmistajat", register, removeUusiOmistaja),
    [register, removeUusiOmistaja]
  );

  const table = useReactTable({
    columns: uudetOmistajatColumns,
    getCoreRowModel: getCoreRowModel(),
    data: fields,
    enableSorting: false,
    defaultColumn: { cell: (cell) => cell.getValue() ?? "-" },
    state: { pagination: undefined },
  });

  return (
    <TiedotettavaHaitari
      expanded={expanded}
      onChange={onChange}
      hakutulosMaara={hakutulosMaara}
      updateTiedotettavat={updateTiedotettavat}
      columns={columns}
      queryResettable={queryResettable}
      setTiedotettavat={setTiedotettavat}
      tiedotettavat={tiedotettavat}
      oid={oid}
      filterText={filterText}
      title={title}
      instructionText={instructionText}
      queryFieldName={queryFieldName}
      bottomContent={
        <>
          <H4>Lisää uusi kiinteistönomistaja</H4>
          {!!fields.length && <HassuTable table={table} />}
          <Button type="button" onClick={appendNewRow}>
            Lisää uusi rivi
          </Button>
        </>
      }
    />
  );
};

const defaultColumnMeta = {
  widthFractions: 3,
  minWidth: 200,
};

function createPoistaColumn(fieldArrayName: FieldArrayName, removeUusiOmistaja?: UseFieldArrayRemove): ColumnDef<OmistajaRow, unknown> {
  const column: ColumnDef<OmistajaRow, unknown> = {
    header: "Poista",
    id: "actions",
    meta: {
      widthFractions: 2,
      minWidth: 120,
    },
    cell: (context) => {
      const rowIndex = context.row.original.rowIndex;

      if (fieldArrayName === "uudetOmistajat" && removeUusiOmistaja) {
        return (
          <IconButton
            type="button"
            onClick={() => {
              removeUusiOmistaja(context.row.index);
            }}
            icon="trash"
          />
        );
      }

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

function createPostitoimipaikkaColumn(
  register: UseFormRegister<FormData>,
  fieldArrayName: FieldArrayName
): ColumnDef<OmistajaRow, unknown> {
  const column: ColumnDef<OmistajaRow, unknown> = {
    header: "Postitoimipaikka",
    accessorKey: "paikkakunta",
    id: "postitoimipaikka",
    meta: defaultColumnMeta,
  };
  if (fieldArrayName !== "suomifiOmistajat") {
    column.cell = (context) => {
      const rowIndex = context.row.original.rowIndex;
      const { onChange, ...registerProps } = register(`${fieldArrayName}.${rowIndex}.paikkakunta`);
      return <TextField {...registerProps} onChange={debounce(onChange, 1000)} />;
    };
  }
  return column;
}

function createPostinumeroColumn(register: UseFormRegister<FormData>, fieldArrayName: FieldArrayName): ColumnDef<OmistajaRow, unknown> {
  const column: ColumnDef<OmistajaRow, unknown> = {
    header: "Postinumero",
    accessorKey: "postinumero",
    id: "postinumero",
    meta: defaultColumnMeta,
  };
  if (fieldArrayName !== "suomifiOmistajat") {
    column.cell = (context) => {
      const rowIndex = context.row.original.rowIndex;
      const { onChange, ...registerProps } = register(`${fieldArrayName}.${rowIndex}.postinumero`);
      return <TextField {...registerProps} onChange={debounce(onChange, 1000)} />;
    };
  }
  return column;
}

function createPostiosoiteColumn(register: UseFormRegister<FormData>, fieldArrayName: FieldArrayName): ColumnDef<OmistajaRow, unknown> {
  const column: ColumnDef<OmistajaRow, unknown> = {
    header: "Postiosoite",
    accessorKey: "jakeluosoite",
    id: "postiosoite",
    meta: defaultColumnMeta,
  };
  if (fieldArrayName !== "suomifiOmistajat") {
    column.cell = (context) => {
      const rowIndex = context.row.original.rowIndex;
      const { onChange, ...registerProps } = register(`${fieldArrayName}.${rowIndex}.jakeluosoite`);
      return <TextField {...registerProps} onChange={debounce(onChange, 1000)} />;
    };
  }
  return column;
}

function createNimiColumn(register: UseFormRegister<FormData>, fieldArrayName: FieldArrayName): ColumnDef<OmistajaRow, unknown> {
  const meta =
    fieldArrayName === "uudetOmistajat"
      ? defaultColumnMeta
      : {
          widthFractions: 3,
          minWidth: 250,
        };
  const column: ColumnDef<OmistajaRow, unknown> = {
    header: "Omistajan nimi",
    accessorFn: ({ etunimet, sukunimi, nimi }) => nimi ?? (etunimet && sukunimi ? `${etunimet} ${sukunimi}` : null),
    id: "omistajan_nimi",
    meta,
  };
  if (fieldArrayName === "uudetOmistajat") {
    column.cell = (context) => {
      const rowIndex = context.row.original.rowIndex;
      const { onChange, ...registerProps } = register(`${fieldArrayName}.${rowIndex}.nimi`);
      return <TextField {...registerProps} onChange={debounce(onChange, 1000)} />;
    };
  }
  return column;
}

function createKiinteistotunnusColumn(
  register: UseFormRegister<FormData>,
  fieldArrayName: FieldArrayName
): ColumnDef<OmistajaRow, unknown> {
  const meta =
    fieldArrayName === "uudetOmistajat"
      ? defaultColumnMeta
      : {
          widthFractions: 2,
          minWidth: 160,
        };
  const column: ColumnDef<OmistajaRow, unknown> = {
    header: "Kiinteistötunnus",
    id: "kiinteistotunnus",
    accessorFn: ({ kiinteistotunnus }) => formatKiinteistotunnus(kiinteistotunnus),
    meta,
  };
  if (fieldArrayName === "uudetOmistajat") {
    column.cell = (context) => {
      const rowIndex = context.row.original.rowIndex;
      const { onChange, ...registerProps } = register(`${fieldArrayName}.${rowIndex}.kiinteistotunnus`);
      return <TextField {...registerProps} onChange={debounce(onChange, 1000)} />;
    };
  }
  return column;
}
