import Button from "@components/button/Button";
import { ButtonFlat, ButtonFlatWithIcon } from "@components/button/ButtonFlat";
import IconButton from "@components/button/IconButton";
import { RectangleButton } from "@components/button/RectangleButton";
import { H4 } from "@components/Headings";
import ContentSpacer from "@components/layout/ContentSpacer";
import HassuTable from "@components/table/HassuTable";
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
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Accordion, AccordionDetails, AccordionDetailsProps, AccordionSummary, TextField } from "@mui/material";
import { Stack, styled } from "@mui/system";
import { KiinteistonOmistajatFormFields, OmistajaRow } from "@pages/yllapito/projekti/[oid]/tiedottaminen/kiinteistonomistajat.dev";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import React, { useCallback, VFC } from "react";
import { Controller, useFieldArray, UseFieldArrayReturn, useFormContext } from "react-hook-form";
import { useIsAboveBreakpoint } from "src/hooks/useIsSize";
import { TiedotettavaHaitariProps } from "./TiedotettavaHaitari";

const typedMemo: <T>(c: T) => T = React.memo;
const MemoHassuTable = typedMemo(HassuTable);

export type SearchTiedotettavatFunction<OmistajaRow> = (
  oid: string,
  muutTiedotettavat: boolean,
  query: string | null | undefined,
  from: number | null | undefined,
  size: number | null | undefined
) => Promise<{ tulokset: OmistajaRow[]; hakutulosMaara: number }>;

const PAGE_SIZE = 25;

export default function MuutOmistajatHaitari({
  instructionText,
  title,
  oid,
  columns,
  tiedotettavat,
  updateTiedotettavat,
  setTiedotettavat,
  hakutulosMaara,
  queryResettable,
  filterText,
  expanded,
  onChange,
  query,
  setQuery,
}: Readonly<TiedotettavaHaitariProps<OmistajaRow>>) {
  return (
    <TableAccordion expanded={expanded} onChange={onChange}>
      <TableAccordionSummary expandIcon={<FontAwesomeIcon icon="angle-down" className="text-white" />}>{title}</TableAccordionSummary>
      <TableAccordionDetails
        oid={oid}
        tiedotettavat={tiedotettavat}
        setTiedotettavat={setTiedotettavat}
        instructionText={instructionText}
        updateTiedotettavat={updateTiedotettavat}
        hakutulosMaara={hakutulosMaara}
        columns={columns}
        filterText={filterText}
        queryResettable={queryResettable}
        query={query}
        setQuery={setQuery}
      />
    </TableAccordion>
  );
}

const TableAccordion = styled(Accordion)(({ theme }) => ({
  boxShadow: "unset",
  marginBottom: "unset",
  "&.Mui-expanded": {
    marginTop: theme.spacing(7),
  },
}));

const TableAccordionSummary = styled(AccordionSummary)({
  backgroundColor: "#0164AF",
  "&.Mui-focusVisible": {
    backgroundColor: "#0164AF",
    outline: "2px solid black",
  },
  color: "#FFFFFF",
  fontWeight: 700,
  fontSize: "1.4375rem",
  lineHeight: 1.174,
  padding: "0rem 1rem",
  "&.MuiAccordionSummary-root.Mui-expanded": {
    minHeight: "unset",
  },
  "& div.MuiAccordionSummary-content": { minHeight: "unset", margin: "12px 0" },
  "& .MuiAccordionSummary-expandIconWrapper > svg": {
    fontSize: "1.75rem",
  },
});

type UusiOmistajaKey = keyof KiinteistonOmistajatFormFields["uudetOmistajat"][0];

type ColumnComponentProps = {
  fieldName: UusiOmistajaKey;
  index: number;
  fieldArray: UseFieldArrayReturn<KiinteistonOmistajatFormFields, "uudetOmistajat", "id">;
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
  const { register, formState } = useFormContext<KiinteistonOmistajatFormFields>();
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
  const { control } = useFormContext<KiinteistonOmistajatFormFields>();
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

const UnstyledTableAccordionDetails = ({
  oid,
  instructionText,
  updateTiedotettavat,
  hakutulosMaara,
  tiedotettavat,
  setTiedotettavat,
  columns,
  filterText,
  queryResettable,
  query,
  setQuery,
  ...props
}: Omit<AccordionDetailsProps, "children"> &
  Pick<
    TiedotettavaHaitariProps<OmistajaRow>,
    "oid" | "instructionText" | "columns" | "filterText" | "tiedotettavat" | "setTiedotettavat" | "query" | "setQuery"
  > & {
    updateTiedotettavat: (query?: string, from?: any, size?: any) => void;
    hakutulosMaara: number | null;
    queryResettable: boolean;
  }) => {
  const { handleSubmit, control } = useFormContext<KiinteistonOmistajatFormFields>();

  const getNextPage = useCallback(() => {
    updateTiedotettavat(query);
  }, [query, updateTiedotettavat]);

  const toggleShowHideAll = useCallback(() => {
    if ((tiedotettavat?.length ?? 0) < (hakutulosMaara ?? 0)) {
      updateTiedotettavat(query, undefined, (hakutulosMaara ?? 0) - (tiedotettavat?.length ?? 0));
    } else {
      setTiedotettavat((oldOmistajat) => {
        return oldOmistajat?.slice(0, PAGE_SIZE) ?? [];
      });
    }
  }, [tiedotettavat?.length, hakutulosMaara, updateTiedotettavat, query, setTiedotettavat]);

  const table = useReactTable({
    columns,
    getCoreRowModel: getCoreRowModel(),
    data: tiedotettavat ?? [],
    enableSorting: false,
    defaultColumn: { cell: (cell) => cell.getValue() ?? "-" },
    state: { pagination: undefined },
  });

  const resetSearch = useCallback(async () => {
    setQuery("");
    setTiedotettavat([]);
    updateTiedotettavat(undefined, 0);
  }, [setQuery, setTiedotettavat, updateTiedotettavat]);

  const showLess = useCallback(() => {
    setTiedotettavat((oldOmistajat) => {
      const remainder = (oldOmistajat?.length ?? 0) % PAGE_SIZE || PAGE_SIZE;
      return oldOmistajat?.slice(0, oldOmistajat.length - remainder) ?? [];
    });
  }, [setTiedotettavat]);

  const onSubmit = useCallback(() => {
    setTiedotettavat([]);
    updateTiedotettavat(query ? query : undefined, 0);
  }, [query, setTiedotettavat, updateTiedotettavat]);

  const fieldArray = useFieldArray({ control, name: "uudetOmistajat" });
  const { append, fields } = fieldArray;

  const appendNewRow = useCallback(() => {
    append({ kiinteistotunnus: "", nimi: "", jakeluosoite: "", postinumero: "", paikkakunta: "" });
  }, [append]);

  const isDesktop = useIsAboveBreakpoint("md");

  return (
    <AccordionDetails {...props}>
      <ContentSpacer gap={7}>
        <p>{instructionText}</p>
        <ContentSpacer>
          <Stack direction="row" justifyContent="space-between" alignItems="end">
            <HaeField sx={{ flexGrow: 1 }} label={filterText} autoComplete="off" />
            <Button primary type="button" endIcon="search" onClick={onSubmit}>
              Suodata
            </Button>
          </Stack>
          {queryResettable && (
            <ButtonFlat onClick={resetSearch} type="button">
              Nollaa suodatus
            </ButtonFlat>
          )}
        </ContentSpacer>
        {typeof hakutulosMaara === "number" && (
          <p>
            Suodatuksella {hakutulosMaara} tulos{hakutulosMaara !== 1 && "ta"}
          </p>
        )}
        {typeof hakutulosMaara === "number" && !!tiedotettavat?.length && (
          <>
            <MemoHassuTable table={table} />
            <Grid>
              <Stack sx={{ gridColumnStart: 2 }} alignItems="center">
                {tiedotettavat.length > PAGE_SIZE && (
                  <RectangleButton type="button" onClick={showLess}>
                    Näytä vähemmän kiinteistönomistajia
                  </RectangleButton>
                )}
                {hakutulosMaara > tiedotettavat.length && (
                  <RectangleButton type="button" onClick={handleSubmit(getNextPage)}>
                    Näytä enemmän kiinteistönomistajia
                  </RectangleButton>
                )}
                {hakutulosMaara > PAGE_SIZE && (
                  <ButtonFlatWithIcon
                    type="button"
                    icon={hakutulosMaara <= tiedotettavat.length ? "chevron-up" : "chevron-down"}
                    onClick={handleSubmit(toggleShowHideAll)}
                  >
                    {hakutulosMaara <= tiedotettavat.length ? "Piilota kaikki" : "Näytä kaikki"}
                  </ButtonFlatWithIcon>
                )}
              </Stack>
              <Button className="ml-auto" disabled>
                Vie Exceliin
              </Button>
            </Grid>
            <>
              <H4>Lisää uusi kiinteistönomistaja</H4>
              {!!fields.length && (
                <TableWrapper>
                  <StyledTable>
                    {isDesktop && (
                      <Thead>
                        <Tr sx={{ gridTemplateColumns }}>
                          {uudetColumns.map((col) => (
                            <HeaderCell key={col.id}>{col.header}</HeaderCell>
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
                                <DataCell key={col.id}>
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
          </>
        )}
      </ContentSpacer>
    </AccordionDetails>
  );
};

const TableAccordionDetails = styled(UnstyledTableAccordionDetails)({
  border: "1px solid #999999",
  borderTopWidth: "0px",
  padding: "1rem 1rem",
}) as typeof UnstyledTableAccordionDetails;

const Grid = styled("div")({
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  justifyItems: "center",
  alignItems: "start",
  gap: "1rem",
});

const HaeField = styled(TextField)({ label: { fontWeight: 700, fontSize: "1.25rem" } });
