import Button from "@components/button/Button";
import IconButton from "@components/button/IconButton";
import ContentSpacer from "@components/layout/ContentSpacer";
import HassuTable from "@components/table/HassuTable";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Accordion, AccordionDetails, AccordionDetailsProps, AccordionSummary, TextField } from "@mui/material";
import { Stack, styled } from "@mui/system";
import { Omistaja } from "@services/api";
import { ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import useApi from "src/hooks/useApi";
import useLoadingSpinner from "src/hooks/useLoadingSpinner";

type Props = { title: string; instructionText: string | JSX.Element; muutOmistajat?: boolean; oid: string };

const PAGE_SIZE = 10;

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
    const [sivu, setSivu] = useState(0);
    const [initialSearchDone, setInitialSearchDone] = useState(false);
    const { withLoadingSpinner } = useLoadingSpinner();
    const api = useApi();

    const columns: ColumnDef<Omistaja>[] = useMemo(() => {
      const cols: ColumnDef<Omistaja>[] = [
        {
          header: "Kiinteistötunnus",
          accessorKey: "kiinteistotunnus",
          id: "kiinteistotunnus",
          meta: {
            widthFractions: 3,
          },
        },
        {
          header: "Omistajan nimi",
          accessorFn: () => "omistajanimi",
          id: "omistajan_nimi",
          meta: {
            widthFractions: 3,
          },
        },
        {
          header: "Postiosoite",
          accessorFn: () => "postiosoite",
          id: "postiosoite",
          meta: {
            widthFractions: 3,
          },
        },
        {
          header: "",
          id: "actions",
          cell: () => {
            return <IconButton type="button" disabled icon="trash" />;
          },
        },
      ];
      return cols;
    }, []);

    const table = useReactTable({
      columns,
      getCoreRowModel: getCoreRowModel(),
      data: [],
      enableSorting: false,
      defaultColumn: { cell: (cell) => cell.getValue() ?? "-" },
      state: { pagination: undefined },
    });

    const haeOmistajia = useCallback(() => {
      withLoadingSpinner(
        (async () => {
          try {
            const { omistajat: lisattavatOmistajat } = await api.haeKiinteistonOmistajat(oid, sivu, muutOmistajat, PAGE_SIZE);
            setSivu(sivu + 1);
            console.log("lissäää ", lisattavatOmistajat);
            setOmistajat([...omistajat, ...lisattavatOmistajat]);
          } catch {}
        })()
      );
    }, [api, muutOmistajat, oid, omistajat, setOmistajat, setSivu, sivu, withLoadingSpinner]);

    useEffect(() => {
      if (expanded && !initialSearchDone) {
        try {
          haeOmistajia();
          setInitialSearchDone(true);
        } catch {
          console.log("prk");
        }
      }
    }, [haeOmistajia, expanded, initialSearchDone, setInitialSearchDone]);

    return (
      <AccordionDetails {...props}>
        <ContentSpacer gap={7}>
          <p>{instructionText}</p>
          <Stack direction="row" justifyContent="space-between" alignItems="end">
            <HaeField sx={{ flexGrow: 1 }} disabled label="Hae kiinteistönomistajia" />
            <Button primary disabled endIcon="search">
              Hae
            </Button>
          </Stack>
          <HassuTable table={table} />
        </ContentSpacer>
      </AccordionDetails>
    );
  }
)({
  border: "1px solid #999999",
  borderTopWidth: "0px",
  padding: "1rem 1rem",
});

const HaeField = styled(TextField)({ label: { fontWeight: 700, fontSize: "1.25rem" } });
