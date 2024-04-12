import Button from "@components/button/Button";
import { ButtonFlat, ButtonFlatWithIcon } from "@components/button/ButtonFlat";
import { RectangleButton } from "@components/button/RectangleButton";
import ContentSpacer from "@components/layout/ContentSpacer";
import HassuTable from "@components/table/HassuTable";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Accordion, AccordionDetails, AccordionDetailsProps, AccordionSummary, TextField } from "@mui/material";
import { Stack, styled } from "@mui/system";
import { ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import React, { useCallback, useEffect, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";

export type GetTiedotettavaFunc<T> = (
  oid: string,
  muutOmistajat: boolean,
  query: string | null | undefined,
  from: number | null | undefined,
  size: number | null | undefined
) => Promise<{
  tiedotettavat: T[];
  hakutulosMaara: number;
}>;

export type TiedotettavaHaitariProps<T> = {
  title: string;
  instructionText: string | JSX.Element;
  filterText: string;
  oid: string;
  columns: ColumnDef<T>[];
  getTiedotettavatCallback: GetTiedotettavaFunc<T>;
  muutTiedotettavat: boolean;
};

type Tiedotettava = Record<string, unknown>;

const PAGE_SIZE = 25;

export default function TiedotettavaHaitari<T extends Tiedotettava>({
  instructionText,
  title,
  oid,
  columns,
  filterText,
  getTiedotettavatCallback,
  muutTiedotettavat,
}: Readonly<TiedotettavaHaitariProps<T>>) {
  const [expanded, setExpanded] = useState(false);

  const handleExpansionChange = useCallback((_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded);
  }, []);

  return (
    <TableAccordion expanded={expanded} onChange={handleExpansionChange}>
      <TableAccordionSummary expandIcon={<FontAwesomeIcon icon="angle-down" className="text-white" />}>{title}</TableAccordionSummary>
      <TableAccordionDetails
        oid={oid}
        instructionText={instructionText}
        columns={columns}
        getTiedotettavatCallback={getTiedotettavatCallback}
        filterText={filterText}
        expanded={expanded}
        muutTiedotettavat={muutTiedotettavat}
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

type TiedotettavaHaitariForm = {
  query: string;
};

const UnstyledTableAccordionDetails = <T extends Record<string, unknown>>({
  oid,
  instructionText,
  columns,
  filterText,
  getTiedotettavatCallback,
  expanded,
  muutTiedotettavat,
  ...props
}: Omit<AccordionDetailsProps, "children"> &
  Pick<
    TiedotettavaHaitariProps<T>,
    "oid" | "instructionText" | "columns" | "filterText" | "getTiedotettavatCallback" | "muutTiedotettavat"
  > & {
    expanded: boolean;
  }) => {
  const { withLoadingSpinner } = useLoadingSpinner();

  const useFormReturn = useForm<TiedotettavaHaitariForm>({
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: { query: "" },
    shouldUnregister: false,
  });

  const { reset, handleSubmit, register } = useFormReturn;

  const [submittedQuery, setSubmittedQuery] = useState<string>("");
  const [queryResettable, setQueryResettable] = useState<boolean>(false);
  const [hakutulosMaara, setHakutulosMaara] = useState<number | null>(null);
  const [tiedotettavat, setTiedotettavat] = useState<T[] | null>(null);
  const [initialSearchDone, setInitialSearchDone] = useState(false);

  const updateTiedotettavat = useCallback<(query?: string, from?: number, size?: number, appendTiedotettavat?: boolean) => void>(
    (query, from = tiedotettavat?.length ?? 0, size = PAGE_SIZE, appendTiedotettavat = true) => {
      withLoadingSpinner(
        (async () => {
          try {
            const response = await getTiedotettavatCallback(oid, muutTiedotettavat, query || undefined, from, size);
            setHakutulosMaara(response.hakutulosMaara);
            if (appendTiedotettavat) {
              setTiedotettavat((oldTiedotettavat) => [...(oldTiedotettavat ?? []), ...response.tiedotettavat]);
            } else {
              setTiedotettavat(response.tiedotettavat);
            }
          } catch {}
        })()
      );
    },
    [getTiedotettavatCallback, muutTiedotettavat, oid, tiedotettavat?.length, withLoadingSpinner]
  );

  const getNextPage = useCallback(() => {
    updateTiedotettavat(submittedQuery);
  }, [submittedQuery, updateTiedotettavat]);

  const toggleShowHideAll = useCallback(() => {
    if ((tiedotettavat?.length ?? 0) < (hakutulosMaara ?? 0)) {
      updateTiedotettavat(submittedQuery, undefined, (hakutulosMaara ?? 0) - (tiedotettavat?.length ?? 0));
    } else {
      setTiedotettavat((oldOmistajat) => {
        return oldOmistajat?.slice(0, PAGE_SIZE) ?? [];
      });
    }
  }, [tiedotettavat?.length, hakutulosMaara, updateTiedotettavat, submittedQuery]);

  const table = useReactTable({
    columns,
    getCoreRowModel: getCoreRowModel(),
    data: tiedotettavat ?? [],
    enableSorting: false,
    defaultColumn: { cell: (cell) => cell.getValue() || "-" },
    state: { pagination: undefined },
  });

  const resetSearch = useCallback(async () => {
    reset();
    setSubmittedQuery("");
    updateTiedotettavat("", 0, PAGE_SIZE, false);
    setQueryResettable(false);
  }, [reset, updateTiedotettavat]);

  const showLess = useCallback(() => {
    setTiedotettavat((oldOmistajat) => {
      const remainder = (oldOmistajat?.length ?? 0) % PAGE_SIZE || PAGE_SIZE;
      return oldOmistajat?.slice(0, oldOmistajat.length - remainder) ?? [];
    });
  }, [setTiedotettavat]);

  const onSubmit: SubmitHandler<TiedotettavaHaitariForm> = useCallback(
    (data) => {
      setSubmittedQuery(data.query);
      setQueryResettable(!!data.query);
      updateTiedotettavat(data.query, 0, undefined, false);
    },
    [updateTiedotettavat]
  );

  useEffect(() => {
    if (!initialSearchDone && expanded) {
      updateTiedotettavat();
      setInitialSearchDone(true);
    }
  }, [expanded, initialSearchDone, updateTiedotettavat]);

  return (
    <AccordionDetails {...props}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <ContentSpacer gap={7}>
          <p>{instructionText}</p>
          <ContentSpacer>
            <Stack direction="row" justifyContent="space-between" alignItems="end">
              <HaeField sx={{ flexGrow: 1 }} label={filterText} autoComplete="off" {...register("query")} />
              <Button primary type="submit" endIcon="search">
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
      </form>
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
