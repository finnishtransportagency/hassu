import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "@components/button/Button";
import HassuDialog from "@components/HassuDialog";
import { DialogActions, DialogContent, Divider, Stack } from "@mui/material";
import HassuAccordion from "@components/HassuAccordion";
import { AineistoInput, api, VelhoAineisto, VelhoAineistoKategoria } from "@services/api";
import { useProjekti } from "src/hooks/useProjekti";
import { formatDateTime } from "src/util/dateUtils";
import HassuSpinner from "@components/HassuSpinner";
import { styled } from "@mui/material/styles";
import { DialogProps } from "@mui/material";
import HassuTable from "@components/HassuTable";
import { useHassuTable } from "src/hooks/useHassuTable";
import { Column } from "react-table";
import { useForm } from "react-hook-form";
import VelhoAineistoNimiExtLink from "../VelhoAineistoNimiExtLink";

interface FormData {
  aineistoKategoriat: VelhoAineistoKategoria[];
}

type Props = {
  infoText?: string | undefined;
  onSubmit: (aineistot: AineistoInput[]) => void;
} & Required<Pick<DialogProps, "onClose" | "open">>;

const useFormOptions = { defaultValues: { aineistoKategoriat: [] } };

export default function AineistojenValitseminenDialog({ onSubmit, infoText, ...muiDialogProps }: Props) {
  const { onClose, open } = muiDialogProps;
  const { data: projekti } = useProjekti();
  const [isLoading, setIsLoading] = useState(false);
  const [fetchedAineistoKategoriat, setFetchedAineistoKategoriat] = useState<VelhoAineistoKategoria[]>();

  const { setValue, watch, handleSubmit, getValues } = useForm<FormData>(useFormOptions);

  useEffect(() => {
    if (projekti && open) {
      const haeAineistotDialogiin = async () => {
        setIsLoading(true);
        const velhoAineistoKategoriat = await api.listaaVelhoProjektiAineistot(projekti.oid);
        setFetchedAineistoKategoriat(velhoAineistoKategoriat);
        setIsLoading(false);
      };
      haeAineistotDialogiin();
    }
  }, [projekti, setFetchedAineistoKategoriat, open]);

  const aineistoKategoriatWatch = watch("aineistoKategoriat");

  const updateValitut = useCallback<(kategoriaNimi: string, selectedRows: VelhoAineisto[]) => void>(
    (kategoriaNimi, rows) => {
      const aineistoKategoriat = getValues("aineistoKategoriat");
      const aineistoKategoria = aineistoKategoriat.find((kategoria) => kategoria.kategoria === kategoriaNimi);
      if (aineistoKategoria) {
        aineistoKategoria.aineistot = rows;
      } else {
        aineistoKategoriat.push({ aineistot: rows, kategoria: kategoriaNimi, __typename: "VelhoAineistoKategoria" });
      }
      setValue("aineistoKategoriat", aineistoKategoriat);
    },
    [setValue, getValues]
  );

  const moveAineistoToMainForm = async (data: FormData) => {
    const newAineistoInput = data.aineistoKategoriat.reduce<AineistoInput[]>((aineistot, kategoria) => {
      aineistot.push(
        ...kategoria.aineistot.map((aineisto) => ({
          dokumenttiOid: aineisto.oid,
          nimi: aineisto.tiedosto,
        }))
      );
      return aineistot;
    }, []);
    onSubmit(newAineistoInput);
    onClose?.({}, "escapeKeyDown");
  };

  if (!projekti) {
    return <></>;
  }

  const valitutAineistot = aineistoKategoriatWatch.reduce<VelhoAineisto[]>((aineistot, kategoria) => {
    aineistot.push(...kategoria.aineistot);
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
                {fetchedAineistoKategoriat && fetchedAineistoKategoriat.length > 0 ? (
                  <HassuAccordion
                    items={
                      fetchedAineistoKategoriat?.map((kategoria) => ({
                        title: `${kategoria.kategoria} (${kategoria?.aineistot?.length || 0})`,
                        id: `aineisto_accordion_${kategoria.kategoria}`,
                        content: (
                          <>
                            {projekti?.oid && kategoria.aineistot && kategoria.aineistot.length > 0 ? (
                              <AineistoTable
                                setSelectedAineisto={updateValitut}
                                kategoria={kategoria.kategoria}
                                data={kategoria.aineistot}
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
  kategoria: string;
  setSelectedAineisto: (kategoria: string, selectedRows: VelhoAineisto[]) => void;
}

const AineistoTable = ({ data, setSelectedAineisto, kategoria }: AineistoTableProps) => {
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
      data,
      initialState: { hiddenColumns: ["oid"] },
    },
    useRowSelect: true,
  });

  const selectedRows = useMemo(
    () => tableProps.tableInstance.selectedFlatRows.map((flatRow) => flatRow.original),
    [tableProps.tableInstance.selectedFlatRows]
  );

  useEffect(() => {
    setSelectedAineisto(kategoria, selectedRows);
  }, [selectedRows, kategoria, setSelectedAineisto]);

  return <HassuTable {...tableProps} />;
};

const StyledDiv = styled("div")({});
