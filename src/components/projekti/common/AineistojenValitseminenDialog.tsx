import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "@components/button/Button";
import HassuDialog from "@components/HassuDialog";
import { DialogActions, DialogContent, Divider, Stack } from "@mui/material";
import HassuAccordion from "@components/HassuAccordion";
import { VelhoAineisto, VelhoToimeksianto } from "@services/api";
import { useProjekti } from "src/hooks/useProjekti";
import { formatDateTime } from "common/util/dateUtils";
import HassuSpinner from "@components/HassuSpinner";
import { styled } from "@mui/material/styles";
import { DialogProps } from "@mui/material";
import HassuTable from "@components/HassuTable";
import { useHassuTable } from "src/hooks/useHassuTable";
import { Column } from "react-table";
import { useForm } from "react-hook-form";
import VelhoAineistoNimiExtLink from "../VelhoAineistoNimiExtLink";
import useApi from "src/hooks/useApi";

interface FormData {
  toimeksiannot: VelhoToimeksianto[];
}

type Props = {
  infoText?: string | undefined;
  onSubmit: (aineistot: VelhoAineisto[]) => void;
} & Required<Pick<DialogProps, "onClose" | "open">>;

const useFormOptions = { defaultValues: { toimeksiannot: [] } };

export default function AineistojenValitseminenDialog({ onSubmit, infoText, ...muiDialogProps }: Props) {
  const { onClose, open } = muiDialogProps;
  const { data: projekti } = useProjekti();
  const [isLoading, setIsLoading] = useState(false);
  const [fetchedToimeksiannot, setFetchedToimeksiannot] = useState<VelhoToimeksianto[]>();

  const { setValue, watch, handleSubmit, getValues } = useForm<FormData>(useFormOptions);
  const api = useApi();

  useEffect(() => {
    if (projekti && open) {
      const haeAineistotDialogiin = async () => {
        setIsLoading(true);
        try {
          const velhoToimeksiannot = await api.listaaVelhoProjektiAineistot(projekti.oid);
          setFetchedToimeksiannot(velhoToimeksiannot);
        } catch {
          // Maybe custom error?
          setFetchedToimeksiannot([]);
        } finally {
          setIsLoading(false);
        }
      };
      haeAineistotDialogiin();
    }
  }, [projekti, setFetchedToimeksiannot, open, api]);

  const toimeksiannotWatch = watch("toimeksiannot");

  const updateValitut = useCallback<(toimeksianto: VelhoToimeksianto, selectedRows: VelhoAineisto[]) => void>(
    (toimeksianto, rows) => {
      const toimeksiannot = getValues("toimeksiannot");
      const toimeksiantoFormValues = toimeksiannot.find((tAnto) => tAnto.oid === toimeksianto.oid);
      if (toimeksiantoFormValues) {
        toimeksiantoFormValues.aineistot = rows;
      } else {
        toimeksiannot.push({ aineistot: rows, nimi: toimeksianto.nimi, __typename: "VelhoToimeksianto", oid: toimeksianto.oid });
      }
      setValue("toimeksiannot", toimeksiannot);
    },
    [setValue, getValues]
  );

  const moveAineistoToMainForm = (data: FormData) => {
    const velhoAineistot: VelhoAineisto[] = data.toimeksiannot.reduce<VelhoAineisto[]>((aineistot, toimeksianto) => {
      aineistot.push(...toimeksianto.aineistot);
      return aineistot;
    }, []);
    onSubmit(velhoAineistot);
    onClose?.({}, "escapeKeyDown");
  };

  if (!projekti) {
    return <></>;
  }

  const valitutAineistot = toimeksiannotWatch.reduce<VelhoAineisto[]>((aineistot, toimeksianto) => {
    aineistot.push(...toimeksianto.aineistot);
    return aineistot;
  }, []);

  return (
    <>
      <HassuDialog
        PaperProps={{ sx: { maxHeight: "95vh", minHeight: "95vh" } }}
        title="Aineistojen valitseminen"
        scroll="paper"
        {...muiDialogProps}
        maxWidth="lg"
      >
        <form style={{ display: "contents" }}>
          <DialogContent sx={{ display: "flex", flexDirection: "column", padding: 0, marginBottom: 7 }}>
            <p>Näet alla Projektivelhoon tehdyt toimeksiannot ja toimeksiantoihin ladatut tiedostot. {infoText}</p>
            <Stack
              direction={{ xs: "column", lg: "row" }}
              style={{ flex: "1 1 auto" }}
              divider={<Divider orientation="vertical" flexItem />}
            >
              <StyledDiv sx={{ width: { lg: "75%" } }}>
                {fetchedToimeksiannot && fetchedToimeksiannot.length > 0 ? (
                  <HassuAccordion
                    items={
                      fetchedToimeksiannot?.map((toimeksianto) => ({
                        title: `${toimeksianto.nimi} (${toimeksianto?.aineistot?.length || 0})`,
                        id: `aineisto_accordion_${toimeksianto.nimi}`,
                        content: (
                          <>
                            {projekti?.oid && toimeksianto.aineistot && toimeksianto.aineistot.length > 0 ? (
                              <AineistoTable
                                setSelectedAineisto={updateValitut}
                                toimeksianto={toimeksianto}
                                data={toimeksianto.aineistot}
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
                <h5 className="vayla-smallest-title">{`Valitut tiedostot (${valitutAineistot.length})`}</h5>
                {projekti?.oid &&
                  valitutAineistot.map((aineisto) => (
                    <VelhoAineistoNimiExtLink key={aineisto.oid} aineistoOid={aineisto.oid} aineistoNimi={aineisto.tiedosto} addTopMargin />
                  ))}
              </StyledDiv>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button primary type="button" id="select_valitut_aineistot_button" onClick={handleSubmit(moveAineistoToMainForm)}>
              Tuo valitut aineistot
            </Button>
            <Button type="button" onClick={() => onClose?.({}, "escapeKeyDown")}>
              Peruuta
            </Button>
          </DialogActions>
        </form>
      </HassuDialog>
      <HassuSpinner open={isLoading} />
    </>
  );
}

interface AineistoTableProps {
  data: VelhoAineisto[];
  toimeksianto: VelhoToimeksianto;
  setSelectedAineisto: (toimeksianto: VelhoToimeksianto, selectedRows: VelhoAineisto[]) => void;
}

const AineistoTable = ({ data, setSelectedAineisto, toimeksianto }: AineistoTableProps) => {
  const columns: Column<VelhoAineisto>[] = useMemo(
    () => [
      {
        Header: "Tiedosto",
        minWidth: 250,
        accessor: (aineisto) => <VelhoAineistoNimiExtLink aineistoOid={aineisto.oid} aineistoNimi={aineisto.tiedosto} />,
      },
      {
        Header: "Muokattu Projektivelhossa",
        accessor: (aineisto) => formatDateTime(aineisto.muokattu),
      },
      { Header: "Dokumenttityyppi", accessor: "dokumenttiTyyppi" },
      { Header: "oid", accessor: "oid" },
    ],
    []
  );

  const tableProps = useHassuTable<VelhoAineisto>({
    tableOptions: {
      columns,
      data: data.sort((aineistoA, aineistoB) => aineistoA.tiedosto.localeCompare(aineistoB.tiedosto)),
      initialState: { hiddenColumns: ["oid"] },
    },
    useRowSelect: true,
  });

  const selectedRows = useMemo(
    () => tableProps.tableInstance.selectedFlatRows.map((flatRow) => flatRow.original),
    [tableProps.tableInstance.selectedFlatRows]
  );

  useEffect(() => {
    setSelectedAineisto(toimeksianto, selectedRows);
  }, [selectedRows, toimeksianto, setSelectedAineisto]);

  return <HassuTable {...tableProps} />;
};

const StyledDiv = styled("div")({});
