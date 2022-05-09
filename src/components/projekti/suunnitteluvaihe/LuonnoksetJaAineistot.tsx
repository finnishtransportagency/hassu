// import { useFormContext } from "react-hook-form";
import SectionContent from "@components/layout/SectionContent";
import Section from "@components/layout/Section";
import { useEffect, useState } from "react";
import Button from "@components/button/Button";
import TextInput from "@components/form/TextInput";
import Notification, { NotificationType } from "@components/notification/Notification";
import HassuDialog from "@components/HassuDialog";
import IconButton from "@components/button/IconButton";
import HassuStack from "@components/layout/HassuStack";
import { TallennaProjektiInput, VuorovaikutusInput } from "@services/api";
import { useFieldArray, UseFormReturn } from "react-hook-form";
import { DialogActions, DialogContent, Divider, Stack } from "@mui/material";
import HassuAccordion from "@components/HassuAccordion";
import Table from "@components/Table";
import { api, VelhoAineisto, VelhoAineistoKategoria } from "@services/api";
import { useProjektiRoute } from "src/hooks/useProjektiRoute";
import { formatDateTime } from "src/util/dateUtils";
import HassuSpinner from "@components/HassuSpinner";

type Videot = Pick<VuorovaikutusInput, "videot">;
type SuunnitteluMateriaali = Pick<VuorovaikutusInput, "suunnittelumateriaali">;

type ProjektiFields = Pick<TallennaProjektiInput, "oid">;
type RequiredProjektiFields = Required<{
  [K in keyof ProjektiFields]: NonNullable<ProjektiFields[K]>;
}>;

type FormValues = RequiredProjektiFields & {
  suunnitteluVaihe: {
    vuorovaikutus: Videot | SuunnitteluMateriaali;
  };
};

interface Props<T> {
  useFormReturn: UseFormReturn<T>;
}

export default function LuonnoksetJaAineistot<T extends FormValues>({ useFormReturn }: Props<T>) {
  const { data: projekti } = useProjektiRoute();
  const [aineistoDialogOpen, setAineistoDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [aineistoKategoriat, setAineistoKategoriat] = useState<VelhoAineistoKategoria[]>();

  const openAineistoDialog = () => setAineistoDialogOpen(true);
  const closeAineistoDialog = () => setAineistoDialogOpen(false);

  useEffect(() => {
    if (projekti && aineistoDialogOpen) {
      const haeAineistotDialogiin = async () => {
        setIsLoading(true);
        const velhoAineistoKategoriat = await api.listaaVelhoProjektiAineistot(projekti.oid);
        setAineistoKategoriat(velhoAineistoKategoriat);
        setIsLoading(false);
      };
      haeAineistotDialogiin();
    }
  }, [aineistoDialogOpen, projekti, setAineistoKategoriat]);

  // const context = useFormContext();

  const {
    control,
    register,
    formState: { errors },
  } = useFormReturn as unknown as UseFormReturn<FormValues>;

  const {
    fields: videotFields,
    append: appendVideot,
    remove: removeVideot,
  } = useFieldArray({
    control,
    name: "suunnitteluVaihe.vuorovaikutus.videot",
  });

  return (
    <Section>
      <SectionContent>
        <h4 className="vayla-small-title">Suunnitelmaluonnokset ja esittelyaineistot</h4>
        <p>
          Esittelyvideo tulee olla ladattuna erilliseen videojulkaisupalveluun (esim. Youtube) ja videon katselulinkki
          tuodaan sille tarkoitettuun kenttään. Luonnokset ja muut materiaalit tuodaan Projektivelhosta.
          Suunnitelmaluonnokset ja esittelyaineistot on mahdollista. Suunnitelmaluonnokset ja aineistot julkaistaan
          palvelun julkisella puolella vuorovaikutuksen julkaisupäivänä.{" "}
        </p>
        <Notification type={NotificationType.INFO_GRAY}>
          Huomioithan, että suunnitelmaluonnoksien ja esittelyaineistojen tulee täyttää saavutettavuusvaatimukset.{" "}
        </Notification>
      </SectionContent>
      <SectionContent>
        <h5 className="vayla-smallest-title">Suunnitelmaluonnokset ja esittelyaineistot</h5>
        <Button type="button" onClick={openAineistoDialog}>
          Tuo Aineistoja
        </Button>
        <HassuDialog
          title="Aineistojen valitseminen"
          open={aineistoDialogOpen}
          onClose={closeAineistoDialog}
          maxWidth="lg"
          scroll="paper"
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
            <Stack direction="row" style={{ flex: "1 1 auto" }} divider={<Divider orientation="vertical" flexItem />}>
              <div style={{ width: "75%" }}>
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
                                    { Header: "Tiedosto", accessor: "tiedosto" },
                                    {
                                      Header: "Muokattu Projektivelhossa",
                                      accessor: (aineisto) => formatDateTime(aineisto.muokattu),
                                    },
                                    { Header: "Dokumenttityyppi", accessor: "dokumenttiTyyppi" },
                                  ],
                                  data: kategoria.aineistot,
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
              </div>
              <div style={{ width: "25%" }}>
                <h5 className="vayla-smallest-title">Valitut tiedostot</h5>
              </div>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button primary type="button" disabled onClick={closeAineistoDialog}>
              Tuo valitut aineistot
            </Button>
            <Button type="button" onClick={closeAineistoDialog}>
              Peruuta
            </Button>
          </DialogActions>
        </HassuDialog>
      </SectionContent>
      <SectionContent>
        <h5 className="vayla-smallest-title">Ennalta kuvattu videoesittely</h5>
        {videotFields.map((field, index) => (
          <HassuStack key={field.id} direction={"row"}>
            <TextInput
              style={{ width: "100%" }}
              key={field.id}
              {...register(`suunnitteluVaihe.vuorovaikutus.videot.${index}.url`)}
              label={`Linkki videoon${videotFields.length > 1 ? " *" : ""}`}
              error={(errors as any)?.suunnitteluVaihe?.vuorovaikutus?.videot?.[index]?.url}
            />
            {!!index && (
              <div>
                <div className="hidden lg:block lg:mt-8">
                  <IconButton
                    icon="trash"
                    onClick={(event) => {
                      event.preventDefault();
                      removeVideot(index);
                    }}
                  />
                </div>
                <div className="block lg:hidden">
                  <Button
                    onClick={(event) => {
                      event.preventDefault();
                      removeVideot(index);
                    }}
                    endIcon="trash"
                  >
                    Poista
                  </Button>
                </div>
              </div>
            )}
          </HassuStack>
        ))}
        <Button
          onClick={(event) => {
            event.preventDefault();
            appendVideot({ nimi: "", url: "" });
          }}
        >
          Lisää uusi +
        </Button>
      </SectionContent>
      <SectionContent>
        <h5 className="vayla-smallest-title">Muut esittelymateriaalit</h5>
        <p>
          Muu esittelymateraali on järjestelmän ulkopuolelle julkaistua suunnitelmaan liittyvää materiaalia. Muun
          esittelymateriaalin lisääminen on vapaaehtoista.{" "}
        </p>
        <TextInput
          style={{ width: "100%" }}
          label="Linkin kuvaus"
          {...register(`suunnitteluVaihe.vuorovaikutus.suunnittelumateriaali.nimi`)}
          error={(errors as any)?.suunnitteluVaihe?.vuorovaikutus?.suunnittelumateriaali?.nimi}
        />
        <TextInput
          style={{ width: "100%" }}
          label="Linkki muihin esittelyaineistoihin"
          {...register(`suunnitteluVaihe.vuorovaikutus.suunnittelumateriaali.url`)}
          error={(errors as any)?.suunnitteluVaihe?.vuorovaikutus?.suunnittelumateriaali?.url}
        />
      </SectionContent>
      <HassuSpinner open={isLoading} />
    </Section>
  );
}
