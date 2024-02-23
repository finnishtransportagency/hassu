import Button from "@components/button/Button";
import { ButtonFlat, ButtonFlatWithIcon } from "@components/button/ButtonFlat";
import { RectangleButton } from "@components/button/RectangleButton";
import ContentSpacer from "@components/layout/ContentSpacer";
import HassuTable from "@components/table/HassuTable";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Accordion, AccordionDetails, AccordionDetailsProps, AccordionSummary, TextField } from "@mui/material";
import { Stack, styled } from "@mui/system";
import { ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import React, { useCallback, useState } from "react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";

export type SearchTiedotettavatFunction<T> = (
  oid: string,
  muutTiedotettavat: boolean,
  query: string | null | undefined,
  from: number | null | undefined,
  size: number | null | undefined
) => Promise<{ tulokset: T[]; hakutulosMaara: number }>;

export type Props<T> = {
  title: string;
  instructionText: string | JSX.Element;
  filterText: string;
  muutTiedotettavat?: boolean;
  oid: string;
  searchTiedotettavat: SearchTiedotettavatFunction<T>;
  columns: ColumnDef<T>[];
};

const PAGE_SIZE = 25;

type Tiedotettava = Record<string, unknown>;

export default function KiinteistonomistajaTable<T extends Tiedotettava>({
  instructionText,
  title,
  muutTiedotettavat = false,
  oid,
  columns,
  searchTiedotettavat,
  filterText,
}: Readonly<Props<T>>) {
  const [expanded, setExpanded] = React.useState(false);

  const [tiedotettavat, setTiedotettavat] = useState<T[] | null>(null);
  const [hakutulosMaara, setHakutulosMaara] = useState<number | null>(null);
  const [query, setQuery] = useState<string | undefined>(undefined);

  const { withLoadingSpinner } = useLoadingSpinner();

  const updateTiedotettavat = useCallback(
    (query?: string, from = tiedotettavat?.length ?? 0, size = PAGE_SIZE) => {
      withLoadingSpinner(
        (async () => {
          try {
            const response = await searchTiedotettavat(oid, muutTiedotettavat, query, from, size);
            setHakutulosMaara(response.hakutulosMaara);
            setTiedotettavat((oldOmistajat) => [...(oldOmistajat ?? []), ...response.tulokset]);
          } catch {}
        })()
      );
    },
    [muutTiedotettavat, oid, tiedotettavat?.length, searchTiedotettavat, withLoadingSpinner]
  );

  const handleChange = useCallback(
    (_event: React.SyntheticEvent, isExpanded: boolean) => {
      if (isExpanded) {
        updateTiedotettavat();
      } else {
        setTiedotettavat(null);
        setHakutulosMaara(null);
      }
      setExpanded(isExpanded);
    },
    [updateTiedotettavat]
  );

  return (
    <TableAccordion expanded={expanded} onChange={handleChange}>
      <TableAccordionSummary expandIcon={<FontAwesomeIcon icon="angle-down" className="text-white" />}>{title}</TableAccordionSummary>
      <TableAccordionDetails
        oid={oid}
        tiedotettavat={tiedotettavat}
        setTiedotettavat={setTiedotettavat}
        instructionText={instructionText}
        muutTiedotettavat={muutTiedotettavat}
        updateTiedotettavat={updateTiedotettavat}
        hakutulosMaara={hakutulosMaara}
        columns={columns}
        query={query}
        setQuery={setQuery}
        filterText={filterText}
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
  muutTiedotettavat = false,
  instructionText,
  updateTiedotettavat,
  hakutulosMaara,
  tiedotettavat,
  setTiedotettavat,
  query,
  setQuery,
  columns,
  filterText,
  ...props
}: Omit<AccordionDetailsProps, "children"> &
  Pick<Props<T>, "oid" | "muutTiedotettavat" | "instructionText" | "columns" | "filterText"> & {
    query: string | undefined;
    setQuery: React.Dispatch<React.SetStateAction<string | undefined>>;
    tiedotettavat: T[] | null;
    updateTiedotettavat: (query?: string, from?: any, size?: any) => void;
    hakutulosMaara: number | null;
    setTiedotettavat: React.Dispatch<React.SetStateAction<T[] | null>>;
  }) => {
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

  type SearchForm = {
    query: string;
  };

  const { handleSubmit, control, setValue } = useForm<SearchForm>({
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: { query: "" },
  });

  const table = useReactTable({
    columns,
    getCoreRowModel: getCoreRowModel(),
    data: tiedotettavat ?? [],
    enableSorting: false,
    defaultColumn: { cell: (cell) => cell.getValue() ?? "-" },
    state: { pagination: undefined },
  });

  const onSubmit: SubmitHandler<SearchForm> = useCallback(
    (data) => {
      const q = data.query ? data.query : undefined;
      setQuery(q);
      setTiedotettavat([]);
      updateTiedotettavat(q, 0);
    },
    [setQuery, setTiedotettavat, updateTiedotettavat]
  );

  const resetSearch = useCallback(async () => {
    setValue("query", "");
    setQuery(undefined);
    setTiedotettavat([]);
    updateTiedotettavat(undefined, 0);
  }, [setValue, setQuery, setTiedotettavat, updateTiedotettavat]);

  const showLess = useCallback(() => {
    setTiedotettavat((oldOmistajat) => {
      const remainder = (oldOmistajat?.length ?? 0) % PAGE_SIZE || PAGE_SIZE;
      return oldOmistajat?.slice(0, oldOmistajat.length - remainder) ?? [];
    });
  }, [setTiedotettavat]);

  return (
    <AccordionDetails {...props}>
      <ContentSpacer gap={7}>
        <p>{instructionText}</p>
        <ContentSpacer>
          <Stack
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            direction="row"
            justifyContent="space-between"
            alignItems="end"
          >
            <Controller
              control={control}
              name="query"
              render={({ field: { name, onBlur, onChange, ref, value } }) => (
                <HaeField
                  sx={{ flexGrow: 1 }}
                  name={name}
                  onBlur={onBlur}
                  onChange={onChange}
                  inputRef={ref}
                  value={value}
                  label={filterText}
                  autoComplete="off"
                />
              )}
            />
            <Button primary type="button" endIcon="search" onClick={handleSubmit(onSubmit)}>
              Suodata
            </Button>
          </Stack>
          {query && (
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
            <HassuTable table={table} />
            <Grid>
              <Stack sx={{ gridColumnStart: 2 }} alignItems="center">
                {tiedotettavat.length > PAGE_SIZE && (
                  <RectangleButton type="button" onClick={showLess}>
                    Näytä vähemmän kiinteistönomistajia
                  </RectangleButton>
                )}
                {hakutulosMaara > tiedotettavat.length && (
                  <RectangleButton type="button" onClick={getNextPage}>
                    Näytä enemmän kiinteistönomistajia
                  </RectangleButton>
                )}
                {hakutulosMaara > PAGE_SIZE && (
                  <ButtonFlatWithIcon
                    type="button"
                    icon={hakutulosMaara <= tiedotettavat.length ? "chevron-up" : "chevron-down"}
                    onClick={toggleShowHideAll}
                  >
                    {hakutulosMaara <= tiedotettavat.length ? "Piilota kaikki" : "Näytä kaikki"}
                  </ButtonFlatWithIcon>
                )}
              </Stack>
              <Button className="ml-auto" disabled>
                Vie Exceliin
              </Button>
            </Grid>
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
