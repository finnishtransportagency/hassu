import React, { useCallback, useRef, VFC } from "react";
import TiedotettavaHaitari, { TiedotettavaHaitariProps } from "@components/projekti/tiedottaminen/TiedotettavaHaitari";
import { Controller, useFieldArray, UseFieldArrayProps, UseFieldArrayReturn, useFormContext, UseFormReturn } from "react-hook-form";
import { OmistajaRow, FormData } from "../../../pages/yllapito/projekti/[oid]/tiedottaminen/kiinteistonomistajat.dev";
import { ColumnDef } from "@tanstack/react-table";
import { formatKiinteistotunnusForDisplay } from "common/util/formatKiinteistotunnus";
import { Checkbox, TextField } from "@mui/material";
import { H4 } from "@components/Headings";
import Button from "@components/button/Button";
import IconButton from "@components/button/IconButton";
import {
  BodyTr,
  BodyTrWrapper,
  DataCell,
  DataCellContent,
  DataCellHeaderContent,
  HeaderCell,
  StyledTable,
  TableWrapper,
  Tbody,
  TbodyWrapper,
  Thead,
  Tr,
} from "@components/table/StyledTableComponents";
import { useIsAboveBreakpoint } from "src/hooks/useIsSize";

type FieldArrayName = UseFieldArrayProps<FormData>["name"];

type OmistajatLomakeOsioProps = {
  oid: string;
  expanded: boolean;
  title: string;
  instructionText: string | JSX.Element;
  fieldArrayName: "suomifiOmistajat" | "muutOmistajat";
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  queryResettable: boolean;
  hakutulosMaara: number | null;
  naytettavatOmistajat: OmistajaRow[] | null;
  setNaytettavatOmistajat: React.Dispatch<React.SetStateAction<OmistajaRow[] | null>>;
  updateTiedotettavat: (query?: string, from?: number, size?: number) => void;
  handleExpansionChange: (_event: React.SyntheticEvent, isExpanded: boolean) => void;
};

type FormRef = React.MutableRefObject<UseFormReturn<FormData, object>>;

const createColumns: (fieldArrayName: FieldArrayName, useFormReturnRef: FormRef) => ColumnDef<OmistajaRow>[] = (
  fieldArrayName,
  useFormReturn
) => [
  createKiinteistotunnusColumn(),
  createNimiColumn(),
  createPostiosoiteColumn(useFormReturn, fieldArrayName),
  createPostinumeroColumn(useFormReturn, fieldArrayName),
  createPostitoimipaikkaColumn(useFormReturn, fieldArrayName),
  createPoistaColumn(fieldArrayName),
];

export const OmistajatLomakeOsio: VFC<OmistajatLomakeOsioProps> = ({
  oid,
  expanded,
  instructionText,
  title,
  fieldArrayName,
  query,
  setQuery,
  queryResettable,
  hakutulosMaara,
  naytettavatOmistajat,
  setNaytettavatOmistajat,
  updateTiedotettavat,
  handleExpansionChange,
}) => {
  const useFormReturn = useFormContext<FormData>();

  const useFormReturnRef = useRef(useFormReturn);

  const columns = createColumns(fieldArrayName, useFormReturnRef);

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
        query={query}
        setQuery={setQuery}
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
      query={query}
      setQuery={setQuery}
    />
  );
};

type UusiOmistajaKey = keyof FormData["uudetOmistajat"][0];

type ColumnComponentProps = {
  fieldName: UusiOmistajaKey;
  index: number;
  fieldArray: UseFieldArrayReturn<FormData, "uudetOmistajat", "id">;
};

type ColumnComponent = VFC<ColumnComponentProps>;

type ColumnSize = {
  fractions?: number;
  minWidth?: number;
};

type Column = {
  id: string;
  header: string;
  fieldName: UusiOmistajaKey;
  columnComponent: ColumnComponent;
  size?: ColumnSize;
};

const ColumnTextFieldComponent: ColumnComponent = ({ fieldName, index }) => {
  const { register, formState } = useFormContext<FormData>();
  const error = formState.errors.uudetOmistajat?.[index]?.[fieldName];
  return (
    <TextField
      {...register(`uudetOmistajat.${index}.${fieldName}`)}
      inputProps={{ maxLength: 200 }}
      error={!!error?.message}
      helperText={error?.message}
      fullWidth
    />
  );
};

const KiinteistotunnusTextFieldComponent: ColumnComponent = ({ fieldName, index }) => {
  const { control } = useFormContext<FormData>();
  return (
    <Controller
      control={control}
      name={`uudetOmistajat.${index}.${fieldName}`}
      render={({ field: { ref, ...field }, fieldState }) => (
        <TextField
          {...field}
          inputProps={{ maxLength: 17, ref }}
          error={!!fieldState.error?.message}
          helperText={fieldState.error?.message}
          fullWidth
        />
      )}
    />
  );
};

const DeleteColumnComponent: ColumnComponent = ({ index, fieldArray }) => (
  <IconButton
    type="button"
    onClick={() => {
      fieldArray.remove(index);
    }}
    icon="trash"
  />
);

const uudetColumns: Column[] = [
  {
    id: "kiinteistotunnus",
    header: "Kiinteistötunnus",
    fieldName: "kiinteistotunnus",
    columnComponent: KiinteistotunnusTextFieldComponent,
  },
  { id: "nimi", header: "Omistajan nimi", fieldName: "nimi", columnComponent: ColumnTextFieldComponent },
  { id: "postiosoite", header: "Postiosoite", fieldName: "jakeluosoite", columnComponent: ColumnTextFieldComponent },
  { id: "postinumero", header: "Postinumero", fieldName: "postinumero", columnComponent: ColumnTextFieldComponent },
  { id: "paikkakunta", header: "Postitoimipaikka", fieldName: "paikkakunta", columnComponent: ColumnTextFieldComponent },
  {
    id: "actions",
    header: "Poista",
    fieldName: "toBeDeleted",
    columnComponent: DeleteColumnComponent,
    size: { fractions: 2, minWidth: 120 },
  },
];

const DEFAULT_COL_MIN_WIDTH = 200;
const DEFAULT_COL_WIDTH_FRACTIONS = 3;

const gridTemplateColumns = uudetColumns
  .map<string>(({ size }) => {
    const minWidth = size?.minWidth ?? DEFAULT_COL_MIN_WIDTH;
    const fractions = size?.fractions ?? DEFAULT_COL_WIDTH_FRACTIONS;
    return `minmax(${minWidth}px, ${fractions}fr)`;
  })
  .join(" ");

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
  query,
  setQuery,
}) => {
  const useFormReturn = useFormContext<FormData>();
  const { control } = useFormReturn;
  const fieldArray = useFieldArray({ control, name: "uudetOmistajat" });
  const { append, fields } = fieldArray;

  const appendNewRow = useCallback(() => {
    append({ kiinteistotunnus: "", nimi: "", jakeluosoite: "", postinumero: "", paikkakunta: "" });
  }, [append]);

  const isDesktop = useIsAboveBreakpoint("md");

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
      query={query}
      setQuery={setQuery}
      bottomContent={
        <>
          <H4>Lisää uusi kiinteistönomistaja</H4>
          {!!fields.length && (
            <TableWrapper>
              <StyledTable>
                {isDesktop && (
                  <Thead>
                    <Tr sx={{ gridTemplateColumns }}>
                      {uudetColumns.map((col) => (
                        <HeaderCell key={col.fieldName}>{col.header}</HeaderCell>
                      ))}
                    </Tr>
                  </Thead>
                )}
                <TbodyWrapper>
                  <Tbody
                    sx={{
                      "& > div:nth-of-type(even)": {
                        background: "#F8F8F8",
                      },
                    }}
                  >
                    {fields.map((field, index) => (
                      <BodyTrWrapper key={field.id} sx={{ borderBottom: "2px #49c2f1 solid" }}>
                        <BodyTr
                          sx={{
                            gridTemplateColumns,
                          }}
                        >
                          {uudetColumns.map((col) => (
                            <DataCell key={col.fieldName}>
                              {!isDesktop && <DataCellHeaderContent>{col.header}</DataCellHeaderContent>}
                              <DataCellContent>
                                {<col.columnComponent fieldName={col.fieldName} index={index} fieldArray={fieldArray} />}
                              </DataCellContent>
                            </DataCell>
                          ))}
                        </BodyTr>
                      </BodyTrWrapper>
                    ))}
                  </Tbody>
                </TbodyWrapper>
              </StyledTable>
            </TableWrapper>
          )}
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
