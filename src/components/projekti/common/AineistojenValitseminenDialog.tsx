import { ForwardRefRenderFunction, forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import Button from "@components/button/Button";
import HassuDialog from "@components/HassuDialog";
import { Checkbox, DialogActions, DialogContent, Divider, Stack, styled, experimental_sx as sx } from "@mui/material";
import HassuAccordion from "@components/HassuAccordion";
import { VelhoAineisto, VelhoToimeksianto } from "@services/api";
import { useProjekti } from "src/hooks/useProjekti";
import { formatDateTime } from "common/util/dateUtils";
import HassuSpinner from "@components/HassuSpinner";
import { DialogProps } from "@mui/material";
import HassuTable from "@components/HassuTable2";
import VelhoAineistoNimiExtLink from "../VelhoAineistoNimiExtLink";
import useApi from "src/hooks/useApi";
import { ColumnDef, HeaderContext, OnChangeFn, RowSelectionState, Table, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import cloneDeep from "lodash/cloneDeep";

type Props = {
  infoText?: string | undefined;
  onSubmit: (aineistot: VelhoAineisto[]) => void;
} & Required<Pick<DialogProps, "onClose" | "open">>;

export default function AineistojenValitseminenDialog({ onSubmit, infoText, ...muiDialogProps }: Props) {
  const { onClose, open } = muiDialogProps;
  const { data: projekti } = useProjekti();
  const [isLoading, setIsLoading] = useState(false);
  const [fetchedToimeksiannot, setFetchedToimeksiannot] = useState<VelhoToimeksianto[]>();
  const [selectedAineistot, setSelectedAineisto] = useState<Record<string, RowSelectionState>>({});
  const [flatAineistot, setFlatAineistot] = useState<VelhoAineisto[]>([]);

  const tableRefs = useRef<Record<string, Table<VelhoAineisto> | null>>({});

  useEffect(() => {
    const aineistot = Object.values(tableRefs.current)
      .filter((table): table is Table<VelhoAineisto> => !!table)
      .reduce<VelhoAineisto[]>((aineistot, table) => {
        aineistot.push(...table.getSelectedRowModel().flatRows.map((flatRow) => flatRow.original));
        return aineistot;
      }, []);
    setFlatAineistot(aineistot);
  }, [selectedAineistot]);

  const api = useApi();

  useEffect(() => {
    if (projekti && open) {
      const haeAineistotDialogiin = async () => {
        setIsLoading(true);
        try {
          const velhoToimeksiannot = await api.listaaVelhoProjektiAineistot(projekti.oid);
          setFetchedToimeksiannot(velhoToimeksiannot);
          const initialSelectedStates = velhoToimeksiannot.reduce<Record<string, RowSelectionState>>(
            (stateToimeksiannoittain, toimeksianto) => {
              stateToimeksiannoittain[toimeksianto.oid] = toimeksianto.aineistot.reduce<RowSelectionState>(
                (toimeksiantoState, aineisto) => {
                  toimeksiantoState[aineisto.oid] = false;
                  return toimeksiantoState;
                },
                {}
              );
              return stateToimeksiannoittain;
            },
            {}
          );
          tableRefs.current = velhoToimeksiannot.reduce<Record<string, Table<VelhoAineisto> | null>>((acc, toimeksianto) => {
            acc[toimeksianto.oid] = null;
            return acc;
          }, {});
          setSelectedAineisto(initialSelectedStates);
        } catch {
          // Maybe custom error?
          setFetchedToimeksiannot([]);
        } finally {
          setIsLoading(false);
        }
      };
      haeAineistotDialogiin();
    }
  }, [projekti, open, api]);

  return (
    <>
      <HassuDialog
        PaperProps={{ sx: { maxHeight: "95vh", minHeight: "95vh" } }}
        title="Aineistojen valitseminen"
        scroll="paper"
        {...muiDialogProps}
        maxWidth="lg"
      >
        <DialogContent sx={{ display: "flex", flexDirection: "column", padding: 0, marginBottom: 7 }}>
          <p>Näet alla Projektivelhoon tehdyt toimeksiannot ja toimeksiantoihin ladatut tiedostot. {infoText}</p>
          <Stack direction={{ xs: "column", lg: "row" }} style={{ flex: "1 1 auto" }} divider={<Divider orientation="vertical" flexItem />}>
            <StyledDiv sx={{ width: { lg: "75%" } }}>
              {fetchedToimeksiannot && fetchedToimeksiannot.length > 0 ? (
                <HassuAccordion
                  items={
                    fetchedToimeksiannot?.map((toimeksianto) => ({
                      title: `${toimeksianto.nimi} (${toimeksianto?.aineistot?.length || 0})`,
                      id: `aineisto_accordion_${toimeksianto.nimi}`,
                      content: (
                        <>
                          {projekti?.oid && toimeksianto.aineistot.length > 0 ? (
                            <ForwardRefAineistoTable
                              ref={(el) => (tableRefs.current[toimeksianto.oid] = el)}
                              setSelectedAineisto={() => {}}
                              toimeksianto={toimeksianto}
                              data={toimeksianto.aineistot}
                              rowSelection={selectedAineistot[toimeksianto.oid]}
                              onRowSelectionChange={(updater) => {
                                const toimeksiannonValitutAineistot =
                                  typeof updater === "function" ? updater(selectedAineistot[toimeksianto.oid]) : updater;
                                const aineistoState = cloneDeep(selectedAineistot);
                                aineistoState[toimeksianto.oid] = toimeksiannonValitutAineistot;
                                setSelectedAineisto(aineistoState);
                              }}
                            />
                          ) : (
                            <p>Projektilla ei ole aineistoa</p>
                          )}
                        </>
                      ),
                    })) || []
                  }
                />
              ) : isLoading ? (
                "Haetaan ainestotietoja velhosta..."
              ) : (
                "Projektivelhossa ei ole aineistoa projektille."
              )}
            </StyledDiv>
            <StyledDiv sx={{ width: { lg: "25%" } }}>
              <h5 className="vayla-smallest-title">{`Valitut tiedostot (${flatAineistot.length})`}</h5>
              {projekti?.oid &&
                flatAineistot.map((aineisto) => (
                  <VelhoAineistoNimiExtLink key={aineisto.oid} aineistoOid={aineisto.oid} aineistoNimi={aineisto.tiedosto} addTopMargin />
                ))}
            </StyledDiv>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            primary
            type="button"
            id="select_valitut_aineistot_button"
            onClick={() => {
              onSubmit(flatAineistot);
              onClose?.({}, "escapeKeyDown");
            }}
          >
            Tuo valitut aineistot
          </Button>
          <Button type="button" onClick={() => onClose?.({}, "escapeKeyDown")}>
            Peruuta
          </Button>
        </DialogActions>
      </HassuDialog>
      <HassuSpinner open={isLoading} />
    </>
  );
}

interface AineistoTableProps {
  data: VelhoAineisto[];
  toimeksianto: VelhoToimeksianto;
  setSelectedAineisto: (toimeksianto: VelhoToimeksianto, selectedRows: VelhoAineisto[]) => void;
  rowSelection: RowSelectionState | undefined;
  onRowSelectionChange: OnChangeFn<RowSelectionState>;
}
const columns: ColumnDef<VelhoAineisto>[] = [
  {
    id: "tiedosto",
    header: "Tiedosto",
    meta: {
      minWidth: 250,
    },
    accessorKey: "tiedosto",
    cell: (aineisto) => {
      const value = aineisto.getValue();
      const oid = aineisto.row.original.oid;
      return typeof value === "string" && <VelhoAineistoNimiExtLink aineistoOid={oid} aineistoNimi={value} />;
    },
  },
  {
    id: "muokattu",
    header: "Muokattu Projektivelhossa",
    accessorFn: (aineisto) => formatDateTime(aineisto.muokattu),
  },
  { header: "Dokumenttityyppi", accessorKey: "dokumenttiTyyppi" },
  {
    id: "select",
    header: SelectHeader,
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        disabled={!row.getCanSelect()}
        indeterminate={row.getIsSomeSelected()}
        onChange={row.getToggleSelectedHandler()}
      />
    ),
  },
];

function SelectHeader(props: HeaderContext<VelhoAineisto, unknown>) {
  return (
    <>
      <Span sx={{ display: "inline-flex", flexDirection: "column", alignItems: "center" }}>
        Valitse
        <Span sx={{ position: "relative" }}>
          <Checkbox
            disabled={!props.table.options.enableRowSelection}
            checked={props.table.getIsAllRowsSelected()}
            indeterminate={props.table.getIsSomeRowsSelected()}
            onChange={props.table.getToggleAllRowsSelectedHandler()}
            sx={{
              "&::before": {
                content: '"("',
                position: "absolute",
                top: "50%",
                left: "5%",
                transform: "translateY(-50%)",
                color: "#7A7A7A",
              },
              "&::after": {
                content: '")"',
                position: "absolute",
                top: "50%",
                right: "5%",
                transform: "translateY(-50%)",
                color: "#7A7A7A",
              },
            }}
          />
        </Span>
      </Span>
    </>
  );
}

const Span = styled("span")(sx({}));

const AineistoTable: ForwardRefRenderFunction<Table<VelhoAineisto> | null, AineistoTableProps> = (
  { data, rowSelection = {}, onRowSelectionChange },
  tableRef
) => {
  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange,
    getRowId: (aineisto) => aineisto.oid,
    state: { pagination: undefined, rowSelection },
    enableRowSelection: true,
    enableSorting: false,
  });

  useImperativeHandle(tableRef, () => table);

  return <HassuTable table={table} />;
};

const ForwardRefAineistoTable = forwardRef(AineistoTable);

const StyledDiv = styled("div")({});
