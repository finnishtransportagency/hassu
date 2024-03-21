import Button from "@components/button/Button";
import { ButtonFlat, ButtonFlatWithIcon } from "@components/button/ButtonFlat";
import IconButton from "@components/button/IconButton";
import { RectangleButton } from "@components/button/RectangleButton";
import ContentSpacer from "@components/layout/ContentSpacer";
import HassuTable from "@components/table/HassuTable";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Accordion, AccordionDetails, AccordionDetailsProps, AccordionSummary, TextField } from "@mui/material";
import { Stack, styled } from "@mui/system";
import { Omistaja } from "@services/api";
import { ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import React, { useCallback, useMemo, useState } from "react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import useApi from "src/hooks/useApi";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";

type Props = { title: string; instructionText: string | JSX.Element; muutOmistajat?: boolean; oid: string };

const PAGE_SIZE = 25;

export default function KiinteistonomistajaTable({ instructionText, title, muutOmistajat = false, oid }: Props) {
  const [expanded, setExpanded] = React.useState(false);
  const [hasBeenExpanded, setHasBeenExpanded] = useState(false);
  const [initialSearchDone, setInitialSearchDone] = useState(false);

  const [omistajat, setOmistajat] = useState<Omistaja[]>([]);
  const [hakutulosMaara, setHakutulosMaara] = useState<number>(0);

  const { withLoadingSpinner } = useLoadingSpinner();
  const api = useApi();

  const searchOmistajat = useCallback(
    (query?: string, from = omistajat.length, size = PAGE_SIZE) => {
      withLoadingSpinner(
        (async () => {
          try {
            const response = await api.haeKiinteistonOmistajat(oid, muutOmistajat, false, query, from, size);
            setHakutulosMaara(response.hakutulosMaara);
            setOmistajat((oldOmistajat) => [...oldOmistajat, ...response.omistajat]);
            setInitialSearchDone(true);
          } catch {}
        })()
      );
    },
    [api, muutOmistajat, oid, omistajat.length, withLoadingSpinner]
  );

  const handleChange = useCallback(
    (_event: React.SyntheticEvent, isExpanded: boolean) => {
      if (isExpanded && !hasBeenExpanded) {
        setHasBeenExpanded(true);
        searchOmistajat();
      }
      setExpanded(isExpanded);
    },
    [hasBeenExpanded, searchOmistajat]
  );

  return (
    <TableAccordion expanded={expanded} onChange={handleChange}>
      <TableAccordionSummary expandIcon={<FontAwesomeIcon icon="angle-down" className="text-white" />}>{title}</TableAccordionSummary>
      <TableAccordionDetails
        oid={oid}
        omistajat={omistajat}
        setOmistajat={setOmistajat}
        instructionText={instructionText}
        muutOmistajat={muutOmistajat}
        searchOmistajat={searchOmistajat}
        hakutulosMaara={hakutulosMaara}
        initialSearchDone={initialSearchDone}
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

const TableAccordionDetails = styled(
  ({
    oid,
    muutOmistajat = false,
    instructionText,
    searchOmistajat,
    hakutulosMaara,
    initialSearchDone,
    omistajat,
    setOmistajat,
    ...props
  }: Omit<AccordionDetailsProps, "children"> &
    Pick<Props, "oid" | "muutOmistajat" | "instructionText"> & {
      omistajat: Omistaja[];
      searchOmistajat: (query?: string, from?: any, size?: any) => void;
      hakutulosMaara: number;
      initialSearchDone: boolean;
      setOmistajat: React.Dispatch<React.SetStateAction<Omistaja[]>>;
    }) => {
    const [query, setQuery] = useState<string | undefined>(undefined);

    const getNextPage = useCallback(() => {
      searchOmistajat(query);
    }, [searchOmistajat, query]);

    const toggleShowHideAll = useCallback(() => {
      if (omistajat.length < hakutulosMaara) {
        searchOmistajat(query, undefined, hakutulosMaara - omistajat.length);
      } else {
        setOmistajat((oldOmistajat) => {
          return oldOmistajat.slice(0, PAGE_SIZE);
        });
      }
    }, [omistajat.length, hakutulosMaara, searchOmistajat, query, setOmistajat]);

    const columns: ColumnDef<Omistaja>[] = useMemo(() => {
      const cols: ColumnDef<Omistaja>[] = [
        {
          header: "Kiinteistötunnus",
          accessorKey: "kiinteistotunnus",
          id: "kiinteistotunnus",
          meta: {
            widthFractions: 2,
            minWidth: 140,
          },
        },
        {
          header: "Omistajan nimi",
          accessorFn: ({ etunimet, sukunimi, nimi }) => nimi ?? (etunimet && sukunimi ? `${etunimet} ${sukunimi}` : null),
          id: "omistajan_nimi",
          meta: {
            widthFractions: 5,
            minWidth: 140,
          },
        },
        {
          header: "Postiosoite",
          accessorKey: "jakeluosoite",
          id: "postiosoite",
          meta: {
            widthFractions: 3,
            minWidth: 120,
          },
        },
        {
          header: "Postinumero",
          accessorKey: "postinumero",
          id: "postinumero",
          meta: {
            widthFractions: 1,
            minWidth: 120,
          },
        },
        {
          header: "Postitoimipaikka",
          accessorKey: "paikkakunta",
          id: "postitoimipaikka",
          meta: {
            widthFractions: 2,
            minWidth: 140,
          },
        },
        {
          header: "",
          id: "actions",
          meta: {
            widthFractions: 2,
            minWidth: 120,
          },
          accessorKey: "id",
          cell: () => {
            return <IconButton sx={{ display: "block", margin: "auto" }} type="button" disabled icon="trash" />;
          },
        },
      ];
      return cols;
    }, []);

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
      data: omistajat,
      enableSorting: false,
      defaultColumn: { cell: (cell) => cell.getValue() ?? "-" },
      state: { pagination: undefined },
    });

    const onSubmit: SubmitHandler<SearchForm> = useCallback(
      (data) => {
        const q = !!data.query ? data.query : undefined;
        setQuery(q);
        setOmistajat([]);
        searchOmistajat(q, 0);
      },
      [searchOmistajat, setOmistajat]
    );

    const resetSearch = useCallback(async () => {
      setValue("query", "");
      setQuery(undefined);
      setOmistajat([]);
      searchOmistajat(undefined, 0);
    }, [searchOmistajat, setOmistajat, setValue]);

    const showLess = useCallback(() => {
      setOmistajat((oldOmistajat) => {
        const remainder = oldOmistajat.length % PAGE_SIZE || PAGE_SIZE;
        return oldOmistajat.slice(0, oldOmistajat.length - remainder);
      });
    }, [setOmistajat]);

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
                    label="Suodata kiinteistönomistajia"
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
          {initialSearchDone && (
            <p>
              Suodatuksella {hakutulosMaara} tulos{hakutulosMaara !== 1 && "ta"}
            </p>
          )}
          {initialSearchDone && !!hakutulosMaara && !!omistajat.length && (
            <>
              <HassuTable table={table} />
              <Grid>
                <Stack sx={{ gridColumnStart: 2 }} alignItems="center">
                  {omistajat.length > PAGE_SIZE && (
                    <RectangleButton type="button" onClick={showLess}>
                      Näytä vähemmän kiinteistönomistajia
                    </RectangleButton>
                  )}
                  {hakutulosMaara > omistajat.length && (
                    <RectangleButton type="button" onClick={getNextPage}>
                      Näytä enemmän kiinteistönomistajia
                    </RectangleButton>
                  )}
                  {hakutulosMaara > PAGE_SIZE && (
                    <ButtonFlatWithIcon
                      type="button"
                      icon={hakutulosMaara <= omistajat.length ? "chevron-up" : "chevron-down"}
                      onClick={toggleShowHideAll}
                    >
                      {hakutulosMaara <= omistajat.length ? "Piilota kaikki" : "Näytä kaikki"}
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
  }
)({
  border: "1px solid #999999",
  borderTopWidth: "0px",
  padding: "1rem 1rem",
});

const Grid = styled("div")({
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  justifyItems: "center",
  alignItems: "start",
  gap: "1rem",
});

const HaeField = styled(TextField)({ label: { fontWeight: 700, fontSize: "1.25rem" } });
