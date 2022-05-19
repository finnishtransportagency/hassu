import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "@components/button/Button";
import HassuDialog from "@components/HassuDialog";
import { DialogActions, DialogContent, Divider, Stack } from "@mui/material";
import HassuAccordion from "@components/HassuAccordion";
import { AineistoInput, api, VelhoAineisto, VelhoAineistoKategoria } from "@services/api";
import { useProjektiRoute } from "src/hooks/useProjektiRoute";
import { formatDateTime } from "src/util/dateUtils";
import HassuSpinner from "@components/HassuSpinner";
import { styled } from "@mui/material/styles";
import { DialogProps } from "@mui/material";
import HassuTable from "@components/HassuTable";
import { useHassuTable } from "src/hooks/useHassuTable";
import { Column } from "react-table";
import { useForm, useFormContext } from "react-hook-form";
import { VuorovaikutusFormValues } from "./SuunnitteluvaiheenVuorovaikuttaminen";
import AineistoNimiExtLink from "../AineistoNimiExtLink";

interface FormData {
  aineistoKategoriat: VelhoAineistoKategoria[];
}

type Props = {
  updateValitutAineistot: (valitutAineistot: VelhoAineisto[]) => void;
} & Required<Pick<DialogProps, "onClose" | "open">>;

const useFormOptions = { defaultValues: { aineistoKategoriat: [] } };

export default function AineistojenValitseminenDialog(props: Props) {
  const { onClose, open, updateValitutAineistot } = props;
  const { data: projekti } = useProjektiRoute();
  const [isLoading, setIsLoading] = useState(false);
  const [aineistoKategoriat, setAineistoKategoriat] = useState<VelhoAineistoKategoria[]>();

  const { setValue: setValueForContext, watch: watchContext } = useFormContext<VuorovaikutusFormValues>();
  const { setValue, watch, handleSubmit } = useForm<FormData>(useFormOptions);

  useEffect(() => {
    if (projekti && open) {
      const haeAineistotDialogiin = async () => {
        setIsLoading(true);
        const velhoAineistoKategoriat = await api.listaaVelhoProjektiAineistot(projekti.oid);
        setAineistoKategoriat(velhoAineistoKategoriat);
        setIsLoading(false);
        const aineistoTiedot = velhoAineistoKategoriat.reduce<VelhoAineisto[]>((aineistoTietoLista, kategoria) => {
          aineistoTietoLista.push(...kategoria.aineistot);
          return aineistoTietoLista;
        }, []);
        updateValitutAineistot(aineistoTiedot);
      };
      haeAineistotDialogiin();
    }
  }, [projekti, setAineistoKategoriat, open, updateValitutAineistot]);

  const valitutAineistoKategoriat = watch("aineistoKategoriat");

  const updateValitut = useCallback<(kategoria: string, selectedRows: VelhoAineisto[]) => void>(
    (kategoria, rows) => {
      const aineistoK =
        aineistoKategoriat?.reduce<VelhoAineistoKategoria[]>((kategoriat, current) => {
          if (current.kategoria === kategoria) {
            kategoriat.push({ ...current, aineistot: rows });
          } else {
            kategoriat.push(current);
          }
          return kategoriat;
        }, []) || [];
      setValue("aineistoKategoriat", aineistoK);
    },
    [aineistoKategoriat, setValue]
  );

  const oldAineistoInput = watchContext("suunnitteluVaihe.vuorovaikutus.aineistot");

  const moveAineistoToMainForm = async (data: FormData) => {
    const aineistoMap = new Map((oldAineistoInput || []).map((aineisto) => [aineisto.dokumenttiOid, aineisto]));

    const newAineistoInput = data.aineistoKategoriat.reduce<AineistoInput[]>((aineistot, kategoria) => {
      aineistot.push(
        ...kategoria.aineistot.map((aineisto, jarjestys) => ({
          dokumenttiOid: aineisto.oid,
          kategoria: kategoria.kategoria,
          jarjestys,
        }))
      );
      return aineistot;
    }, []);

    newAineistoInput.forEach((aineistoInput) => {
      aineistoMap.set(aineistoInput.dokumenttiOid, aineistoInput);
    });

    setValueForContext("suunnitteluVaihe.vuorovaikutus.aineistot", [...aineistoMap.values()]);
    onClose?.({}, "escapeKeyDown");
  };

  return (
    <>
      <HassuDialog
        PaperProps={{ sx: { maxHeight: "95vh", minHeight: "95vh" } }}
        title="Aineistojen valitseminen"
        scroll="paper"
        {...props}
        maxWidth="lg"
      >
        <form style={{ display: "contents" }}>
          <DialogContent sx={{ display: "flex", flexDirection: "column", padding: 0, marginBottom: 7 }}>
            <p>
              Näet alla Projektivelhoon tehdyt toimeksiannot ja toimeksiantoihin ladatut tiedostot. Valitse tiedostot,
              jotka haluat tuoda suunnitteluvaiheeseen.{" "}
            </p>
            <Stack
              direction={{ xs: "column", lg: "row" }}
              style={{ flex: "1 1 auto" }}
              divider={<Divider orientation="vertical" flexItem />}
            >
              <StyledDiv sx={{ width: { lg: "75%" } }}>
                {aineistoKategoriat && aineistoKategoriat.length > 0 ? (
                  <HassuAccordion
                    items={
                      aineistoKategoriat?.map((kategoria) => ({
                        title: kategoria.kategoria,
                        content: (
                          <>
                            {projekti?.oid && kategoria.aineistot && kategoria.aineistot.length > 0 ? (
                              <AineistoTable
                                setSelectedAineisto={updateValitut}
                                kategoria={kategoria.kategoria}
                                data={kategoria.aineistot}
                                projektiOid={projekti.oid}
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
                <h5 className="vayla-smallest-title">Valitut tiedostot</h5>
                {projekti?.oid &&
                  valitutAineistoKategoriat
                    .reduce<VelhoAineisto[]>((aineistot, kategoria) => {
                      aineistot.push(...kategoria.aineistot);
                      return aineistot;
                    }, [])
                    .map((aineisto) => (
                      <AineistoNimiExtLink
                        key={aineisto.oid}
                        aineistoOid={aineisto.oid}
                        aineistoNimi={aineisto.tiedosto}
                        projektiOid={projekti.oid}
                        addTopMargin
                      />
                    ))}
              </StyledDiv>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button primary type="button" onClick={handleSubmit(moveAineistoToMainForm)}>
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
  projektiOid: string;
  data: VelhoAineisto[];
  kategoria: string;
  setSelectedAineisto: (kategoria: string, selectedRows: VelhoAineisto[]) => void;
}

const AineistoTable = ({ projektiOid, data, setSelectedAineisto, kategoria }: AineistoTableProps) => {
  const columns: Column<VelhoAineisto>[] = useMemo(
    () => [
      {
        Header: "Tiedosto",
        minWidth: 250,
        accessor: (aineisto) => (
          <AineistoNimiExtLink aineistoOid={aineisto.oid} aineistoNimi={aineisto.tiedosto} projektiOid={projektiOid} />
        ),
      },
      {
        Header: "Muokattu Projektivelhossa",
        accessor: (aineisto) => formatDateTime(aineisto.muokattu),
      },
      { Header: "Dokumenttityyppi", accessor: "dokumenttiTyyppi" },
      { Header: "oid", accessor: "oid" },
    ],
    [projektiOid]
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
