import Button from "@components/button/Button";
import ButtonFlatWithIcon from "@components/button/ButtonFlat";
import { GradientBorderButton } from "@components/button/GradientButton";
import IconButton from "@components/button/IconButton";
import { RectangleButton } from "@components/button/RectangleButton";
import ContentSpacer from "@components/layout/ContentSpacer";
import HassuTable from "@components/table/HassuTable";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Accordion, AccordionDetails, AccordionDetailsProps, AccordionSummary, TextField } from "@mui/material";
import { Stack, styled } from "@mui/system";
import { Omistaja } from "@services/api";
import { ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import useApi from "src/hooks/useApi";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";

type Props = { title: string; instructionText: string | JSX.Element; muutOmistajat?: boolean; oid: string };

const PAGE_SIZE = 25;

export default function KiinteistonomistajaTable({ instructionText, title, muutOmistajat, oid }: Props) {
  const [expanded, setExpanded] = React.useState(false);

  const handleChange = useCallback((_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded);
  }, []);

  return (
    <>
      <TableAccordion expanded={expanded} onChange={handleChange}>
        <TableAccordionSummary expandIcon={<FontAwesomeIcon icon="angle-down" className="text-white" />}>{title}</TableAccordionSummary>
        <TableAccordionDetails expanded={expanded} oid={oid} instructionText={instructionText} muutOmistajat={muutOmistajat} />
      </TableAccordion>
    </>
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
    expanded,
    ...props
  }: Omit<AccordionDetailsProps, "children"> &
    Pick<Props, "oid" | "muutOmistajat" | "instructionText"> & {
      expanded: boolean;
    }) => {
    const [omistajat, setOmistajat] = useState<Omistaja[]>([]);
    const [hakutulosMaara, setHakutulosMaara] = useState<number>(0);
    // Sivutus alkaa yhdestä
    const [initialSearchDone, setInitialSearchDone] = useState(false);
    const [onlyKiinteistotunnus, setOnlyKiinteistotunnus] = useState(true);
    const [query, setQuery] = useState<string | undefined>(undefined);

    const { withLoadingSpinner } = useLoadingSpinner();
    const api = useApi();

    const searchOmistajat = useCallback(
      (
        appendToOmistajat: boolean,
        onlyKiinteistotunnus: boolean,
        query: string | undefined,
        start: number,
        end?: number,
        callback?: () => Promise<void>
      ) => {
        withLoadingSpinner(
          (async () => {
            try {
              const response = await api.haeKiinteistonOmistajat(oid, muutOmistajat, onlyKiinteistotunnus, query, start, end);
              setHakutulosMaara(response.hakutulosMaara);
              setOmistajat(appendToOmistajat ? [...omistajat, ...response.omistajat] : response.omistajat);
              await callback?.();
            } catch {}
          })()
        );
      },
      [api, muutOmistajat, oid, omistajat, withLoadingSpinner]
    );

    const getNextPage = useCallback(() => {
      searchOmistajat(true, onlyKiinteistotunnus, query, omistajat.length, omistajat.length + PAGE_SIZE);
    }, [searchOmistajat, onlyKiinteistotunnus, query, omistajat.length]);

    const toggleShowHideAll = useCallback(() => {
      if (omistajat.length < hakutulosMaara) {
        searchOmistajat(false, onlyKiinteistotunnus, query, omistajat.length, hakutulosMaara);
      } else {
        searchOmistajat(false, onlyKiinteistotunnus, query, 0, PAGE_SIZE);
      }
    }, [omistajat.length, hakutulosMaara, searchOmistajat, onlyKiinteistotunnus, query]);

    useEffect(() => {
      if (expanded && !initialSearchDone) {
        searchOmistajat(false, onlyKiinteistotunnus, query, 0, PAGE_SIZE, async () => {
          setInitialSearchDone(true);
        });
      }
    }, [expanded, initialSearchDone, searchOmistajat, onlyKiinteistotunnus, query]);

    const toggleTiedotVisible = useCallback(() => {
      searchOmistajat(false, !onlyKiinteistotunnus, query, 0, omistajat.length, async () => {
        setOnlyKiinteistotunnus(!onlyKiinteistotunnus);
      });
    }, [searchOmistajat, onlyKiinteistotunnus, query, omistajat.length]);

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
          header: () => (
            <GradientBorderButton sx={{ display: "block", margin: "auto" }} type="button" onClick={toggleTiedotVisible}>
              {onlyKiinteistotunnus ? "Näytä tiedot" : "Piilota tiedot"}
            </GradientBorderButton>
          ),
          id: "actions",
          meta: {
            widthFractions: 2,
            minWidth: 120,
          },
          accessorKey: "id",
          cell: ({ getValue }) => {
            const value = getValue() as string;

            return (
              <IconButton
                sx={{ display: "block", margin: "auto" }}
                type="button"
                disabled={typeof value !== "string"}
                onClick={() => {
                  withLoadingSpinner(
                    (async () => {
                      try {
                        await api.poistaKiinteistonOmistaja(oid, value);
                        setOmistajat((omistajat) => omistajat.filter((omistaja) => omistaja.id !== value));
                        setHakutulosMaara((maara) => maara - 1);
                      } catch (e) {
                        console.log(e);
                      }
                    })()
                  );
                }}
                icon="trash"
              />
            );
          },
        },
      ];
      return cols;
    }, [api, oid, onlyKiinteistotunnus, toggleTiedotVisible, withLoadingSpinner]);

    type SearchForm = {
      query: string;
    };

    const { handleSubmit, control } = useForm<SearchForm>({
      mode: "onChange",
      reValidateMode: "onChange",
      defaultValues: { query: "" },
    });

    const table = useReactTable({
      columns,
      getCoreRowModel: getCoreRowModel(),
      data: omistajat,
      enableSorting: false,
      defaultColumn: { cell: (cell) => cell.getValue() ?? (onlyKiinteistotunnus ? "*****" : "-") },
      state: { pagination: undefined },
    });

    const onSubmit: SubmitHandler<SearchForm> = useCallback(
      (data) => {
        const q = !!data.query ? data.query : undefined;
        setQuery(q);
        searchOmistajat(false, onlyKiinteistotunnus, q, 0, PAGE_SIZE);
      },
      [onlyKiinteistotunnus, searchOmistajat]
    );

    return (
      <AccordionDetails {...props}>
        <ContentSpacer gap={7}>
          <p>{instructionText}</p>
          <Stack component="form" direction="row" justifyContent="space-between" alignItems="end">
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
                  label="Hae kiinteistönomistajia"
                />
              )}
            />
            <Button primary type="button" endIcon="search" onClick={handleSubmit(onSubmit)}>
              Hae
            </Button>
          </Stack>
          {initialSearchDone && (
            <p>
              Haulla {hakutulosMaara} tulos{hakutulosMaara !== 1 && "ta"}
            </p>
          )}
          {initialSearchDone && !!hakutulosMaara && (
            <>
              <HassuTable table={table} />
              <Grid>
                <Stack sx={{ gridColumnStart: 2 }} alignItems="center">
                  {hakutulosMaara > omistajat.length && (
                    <RectangleButton type="button" onClick={getNextPage}>
                      Näytä enemmän kiinteistönomistajia
                    </RectangleButton>
                  )}
                  <ButtonFlatWithIcon
                    type="button"
                    icon={hakutulosMaara <= omistajat.length ? "chevron-up" : "chevron-down"}
                    onClick={toggleShowHideAll}
                  >
                    {hakutulosMaara <= omistajat.length ? "Piilota kaikki" : "Näytä kaikki"}
                  </ButtonFlatWithIcon>
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
