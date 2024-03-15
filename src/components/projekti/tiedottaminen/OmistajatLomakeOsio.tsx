import React, { useCallback, useMemo, useState, VFC } from "react";
import TiedotettavaHaitari from "@components/projekti/tiedottaminen/TiedotettavaHaitari";
import useApi from "src/hooks/useApi";
import { Controller, useFieldArray, UseFieldArrayProps, useFormContext, UseFormRegister } from "react-hook-form";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";
import { OmistajaRow, FormData, PAGE_SIZE } from "../../../pages/yllapito/projekti/[oid]/tiedottaminen/kiinteistonomistajat.dev";
import { ColumnDef } from "@tanstack/react-table";
import { formatKiinteistotunnus } from "common/util/formatKiinteistotunnus";
import { Checkbox, TextField } from "@mui/material";
import debounce from "lodash/debounce";

type FieldArrayName = UseFieldArrayProps<FormData>["name"];

type OmistajatLomakeOsioProps = {
  oid: string;
  expanded: boolean;
  setExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  muutOmistajat?: boolean;
  title: string;
  instructionText: string | JSX.Element;
  fieldArrayName: FieldArrayName;
  queryFieldName: "muutOmistajatQuery" | "suomifiOmistajatQuery";
};

const createColumns: (fieldArrayName: FieldArrayName, register: UseFormRegister<FormData>) => ColumnDef<OmistajaRow>[] = (
  fieldArrayName,
  register
) => [
  createKiinteistotunnusColumn(),
  createNimiColumn(),
  createPostiosoiteColumn(register, fieldArrayName),
  createPostinumeroColumn(register, fieldArrayName),
  createPostitoimipaikkaColumn(register, fieldArrayName),
  createPoistaColumn(fieldArrayName),
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
};

function createPoistaColumn(fieldArrayName: string): ColumnDef<OmistajaRow, unknown> {
  return {
    header: "Poista",
    id: "actions",
    meta: {
      widthFractions: 2,
      minWidth: 120,
    },
    accessorKey: "rowIndex",
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
}

function createPostitoimipaikkaColumn(
  register: UseFormRegister<FormData>,
  fieldArrayName: FieldArrayName
): ColumnDef<OmistajaRow, unknown> {
  const column: ColumnDef<OmistajaRow, unknown> = {
    header: "Postitoimipaikka",
    accessorKey: "paikkakunta",
    id: "postitoimipaikka",
    meta: {
      widthFractions: 3,
      minWidth: 200,
    },
  };
  if (fieldArrayName === "muutOmistajat") {
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
    meta: {
      widthFractions: 3,
      minWidth: 200,
    },
  };
  if (fieldArrayName === "muutOmistajat") {
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
    meta: {
      widthFractions: 3,
      minWidth: 200,
    },
  };
  if (fieldArrayName === "muutOmistajat") {
    column.cell = (context) => {
      const rowIndex = context.row.original.rowIndex;
      const { onChange, ...registerProps } = register(`${fieldArrayName}.${rowIndex}.jakeluosoite`);
      return <TextField {...registerProps} onChange={debounce(onChange, 1000)} />;
    };
  }
  return column;
}

function createNimiColumn(): ColumnDef<OmistajaRow, unknown> {
  return {
    header: "Omistajan nimi",
    accessorFn: ({ etunimet, sukunimi, nimi }) => nimi ?? (etunimet && sukunimi ? `${etunimet} ${sukunimi}` : null),
    id: "omistajan_nimi",
    meta: {
      widthFractions: 3,
      minWidth: 250,
    },
  };
}

function createKiinteistotunnusColumn(): ColumnDef<OmistajaRow, unknown> {
  return {
    header: "Kiinteistötunnus",
    id: "kiinteistotunnus",
    accessorFn: ({ kiinteistotunnus }) => formatKiinteistotunnus(kiinteistotunnus),
    meta: {
      widthFractions: 2,
      minWidth: 160,
    },
  };
}
