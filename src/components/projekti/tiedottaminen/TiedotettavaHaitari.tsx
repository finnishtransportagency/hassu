import Button from "@components/button/Button";
import { ButtonFlat, ButtonFlatWithIcon } from "@components/button/ButtonFlat";
import { RectangleButton } from "@components/button/RectangleButton";
import ContentSpacer from "@components/layout/ContentSpacer";
import HassuTable from "@components/table/HassuTable";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Accordion, AccordionDetails, AccordionDetailsProps, AccordionProps, AccordionSummary, TextField } from "@mui/material";
import { Stack, styled } from "@mui/system";
import { ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import React, { ReactNode, useCallback } from "react";
import { useFormContext } from "react-hook-form";

const typedMemo: <T>(c: T) => T = React.memo;
const MemoHassuTable = typedMemo(HassuTable);

export type SearchTiedotettavatFunction<T> = (
  oid: string,
  muutTiedotettavat: boolean,
  query: string | null | undefined,
  from: number | null | undefined,
  size: number | null | undefined
) => Promise<{ tulokset: T[]; hakutulosMaara: number }>;

export type TiedotettavaHaitariProps<T> = {
  title: string;
  instructionText: string | JSX.Element;
  filterText: string;
  tiedotettavat: T[] | null;
  setTiedotettavat: React.Dispatch<React.SetStateAction<T[] | null>>;
  hakutulosMaara: number | null;
  oid: string;
  updateTiedotettavat: (query?: string, from?: number, size?: number) => void;
  queryResettable: boolean;
  columns: ColumnDef<T>[];
  expanded: boolean;
  onChange: Exclude<AccordionProps["onChange"], undefined>;
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  bottomContent?: ReactNode;
};

type Tiedotettava = Record<string, unknown>;

const PAGE_SIZE = 25;

export default function TiedotettavaHaitari<T extends Tiedotettava>({
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
  bottomContent,
}: Readonly<TiedotettavaHaitariProps<T>>) {
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
        bottomContent={bottomContent}
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

const UnstyledTableAccordionDetails = <T extends Record<string, unknown>>({
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
  bottomContent,
  ...props
}: Omit<AccordionDetailsProps, "children"> &
  Pick<
    TiedotettavaHaitariProps<T>,
    "oid" | "instructionText" | "columns" | "filterText" | "tiedotettavat" | "setTiedotettavat" | "query" | "setQuery" | "bottomContent"
  > & {
    updateTiedotettavat: (query?: string, from?: any, size?: any) => void;
    hakutulosMaara: number | null;
    queryResettable: boolean;
  }) => {
  const { handleSubmit } = useFormContext();

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
            {bottomContent}
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
