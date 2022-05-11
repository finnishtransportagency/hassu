// import { useFormContext } from "react-hook-form";
import { useEffect, useState } from "react";
import Button from "@components/button/Button";
import HassuDialog from "@components/HassuDialog";
import { DialogActions, DialogContent, Divider, Stack } from "@mui/material";
import HassuAccordion from "@components/HassuAccordion";
import Table from "@components/Table";
import { api, VelhoAineisto, VelhoAineistoKategoria } from "@services/api";
import { useProjektiRoute } from "src/hooks/useProjektiRoute";
import { formatDateTime } from "src/util/dateUtils";
import HassuSpinner from "@components/HassuSpinner";
import { styled } from "@mui/material/styles";
import ExtLink from "@components/ExtLink";
import log from "loglevel";
import { DialogProps } from "@mui/material";

export default function AineistojenValitseminenDialog(props: Pick<DialogProps, "onClose" | "open">) {
  const { data: projekti } = useProjektiRoute();
  const [isLoading, setIsLoading] = useState(false);
  const [aineistoKategoriat, setAineistoKategoriat] = useState<VelhoAineistoKategoria[]>();

  useEffect(() => {
    if (projekti && props.open) {
      const haeAineistotDialogiin = async () => {
        setIsLoading(true);
        const velhoAineistoKategoriat = await api.listaaVelhoProjektiAineistot(projekti.oid);
        setAineistoKategoriat(velhoAineistoKategoriat);
        setIsLoading(false);
      };
      haeAineistotDialogiin();
    }
  }, [props.open, projekti, setAineistoKategoriat]);

  return (
    <>
      <HassuDialog
        title="Aineistojen valitseminen"
        {...props}
        maxWidth="lg"
        PaperProps={{
          sx: {
            maxHeight: "80vh",
            minHeight: "80vh",
          },
        }}
      >
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
                          {kategoria.aineistot && kategoria.aineistot.length > 0 ? (
                            <Table<VelhoAineisto>
                              tableOptions={{
                                columns: [
                                  {
                                    Header: "Tiedosto",
                                    accessor: (aineisto) => (
                                      <ExtLink
                                        as="button"
                                        onClick={async () => {
                                          if (projekti?.oid) {
                                            try {
                                              const link = await api.haeVelhoProjektiAineistoLinkki(
                                                projekti.oid,
                                                aineisto.oid
                                              );
                                              const anchor = document.createElement("a");
                                              anchor.href = link;
                                              anchor.download = aineisto.tiedosto;
                                              anchor.click();
                                            } catch (e) {
                                              log.error("Error gathering aineistolinkki", e);
                                            }
                                          }
                                        }}
                                      >
                                        {aineisto.tiedosto}
                                      </ExtLink>
                                    ),
                                  },
                                  {
                                    Header: "Muokattu Projektivelhossa",
                                    accessor: (aineisto) => formatDateTime(aineisto.muokattu),
                                  },
                                  { Header: "Dokumenttityyppi", accessor: "dokumenttiTyyppi" },
                                  { Header: "oid", accessor: "oid" },
                                ],
                                data: kategoria.aineistot,
                                initialState: { hiddenColumns: ["oid"] },
                              }}
                              useRowSelect
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
            </StyledDiv>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button primary type="button" disabled onClick={() => props.onClose?.({}, "escapeKeyDown")}>
            Tuo valitut aineistot
          </Button>
          <Button type="button" onClick={() => props.onClose?.({}, "escapeKeyDown")}>
            Peruuta
          </Button>
        </DialogActions>
      </HassuDialog>
      <HassuSpinner open={isLoading} />
    </>
  );
}

const StyledDiv = styled("div")({});
