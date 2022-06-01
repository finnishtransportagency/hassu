import SectionContent from "@components/layout/SectionContent";
import Section from "@components/layout/Section";
import { Key, useMemo, useState } from "react";
import Button from "@components/button/Button";
import TextInput from "@components/form/TextInput";
import Notification, { NotificationType } from "@components/notification/Notification";
import IconButton from "@components/button/IconButton";
import HassuStack from "@components/layout/HassuStack";
import { FieldArrayWithId, useFieldArray, UseFieldArrayReturn, useFormContext, UseFormRegister } from "react-hook-form";
import AineistojenValitseminenDialog from "./AineistojenValitseminenDialog";
import { Link } from "@mui/material";
import { VuorovaikutusFormValues } from "./SuunnitteluvaiheenVuorovaikuttaminen";
import AineistoNimiExtLink from "../AineistoNimiExtLink";
import { useProjektiRoute } from "src/hooks/useProjektiRoute";
import { Aineisto, Vuorovaikutus } from "@services/api";
import HassuTable from "@components/HassuTable";
import { useHassuTable } from "src/hooks/useHassuTable";
import { Column } from "react-table";
import HassuAccordion from "@components/HassuAccordion";
import Select from "@components/form/Select";
import { formatDateTime } from "src/util/dateUtils";
import { find } from "lodash";

interface Props {
  vuorovaikutus: Vuorovaikutus | undefined;
  muokkaustila: boolean;
  setMuokkaustila: React.Dispatch<React.SetStateAction<boolean>>;
  saveForm: (e?: React.BaseSyntheticEvent<object, any, any> | undefined) => Promise<void>;
}

export default function LuonnoksetJaAineistot({ saveForm, vuorovaikutus, muokkaustila, setMuokkaustila }: Props) {
  const { data: projekti } = useProjektiRoute();
  const [esittelyAineistoDialogOpen, setEsittelyAineistoDialogOpen] = useState(false);
  const [suunnitelmaLuonnoksetDialogOpen, setSuunnitelmaLuonnoksetDialogOpen] = useState(false);
  const [expandedEsittelyAineisto, setExpandedEsittelyAineisto] = useState<Key[]>([]);
  const [expandedSuunnitelmaLuonnokset, setExpandedSuunnitelmaLuonnokset] = useState<Key[]>([]);

  const julkinen = vuorovaikutus?.julkinen;

  const {
    control,
    register,
    formState: { errors, isDirty },
    reset,
    setValue,
    watch,
  } = useFormContext<VuorovaikutusFormValues>();

  const esittelyAineistotFieldArray = useFieldArray({
    control,
    name: "suunnitteluVaihe.vuorovaikutus.esittelyaineistot",
  });

  const suunnitelmaLuonnoksetFieldArray = useFieldArray({
    control,
    name: "suunnitteluVaihe.vuorovaikutus.suunnitelmaluonnokset",
  });

  const {
    fields: videotFields,
    append: appendVideot,
    remove: removeVideot,
  } = useFieldArray({
    control,
    name: "suunnitteluVaihe.vuorovaikutus.videot",
  });

  const esittelyaineistot = watch("suunnitteluVaihe.vuorovaikutus.esittelyaineistot");
  const suunnitelmaluonnokset = watch("suunnitteluVaihe.vuorovaikutus.suunnitelmaluonnokset");

  return (
    <>
      {!muokkaustila && julkinen && (
        <Section>
          <Button style={{ float: "right" }} type="button" onClick={() => setMuokkaustila(true)}>
            Muokkaa
          </Button>
          <p className="vayla-label mb-5">Suunnitelmaluonnokset ja esittelyaineistot</p>
          {!!vuorovaikutus?.videot?.length && (
            <SectionContent>
              <div>Videoesittely</div>
              {vuorovaikutus.videot.map((video) => (
                <div key={video.url} style={{ marginTop: "0.4rem" }}>
                  <Link underline="none" href={video.url}>
                    {video.url}
                  </Link>
                </div>
              ))}
            </SectionContent>
          )}
          {!vuorovaikutus?.suunnitelmaluonnokset?.length && !vuorovaikutus?.esittelyaineistot?.length && (
            <SectionContent>
              <p>Lisää suunnitelmalle luonnokset ja esittelyaineistot Muokkaa-painikkeesta.</p>
            </SectionContent>
          )}
          {!!vuorovaikutus?.esittelyaineistot?.length && (
            <SectionContent>
              <div>Esittelyaineistot</div>
              {vuorovaikutus.esittelyaineistot.map((aineisto) => (
                <div key={aineisto.dokumenttiOid} style={{ marginTop: "0.4rem" }}>
                  <Link underline="none" href={aineisto.tiedosto || "#"}>
                    {aineisto.nimi}
                  </Link>
                </div>
              ))}
            </SectionContent>
          )}
          {!!vuorovaikutus?.suunnitelmaluonnokset?.length && (
            <SectionContent>
              <div>Suunnitelmaluonnokset</div>
              {vuorovaikutus.suunnitelmaluonnokset.map((aineisto) => (
                <div key={aineisto.dokumenttiOid} style={{ marginTop: "0.4rem" }}>
                  <Link underline="none" href={aineisto.tiedosto || "#"}>
                    {aineisto.nimi}
                  </Link>
                </div>
              ))}
            </SectionContent>
          )}
          {vuorovaikutus?.suunnittelumateriaali?.nimi && (
            <SectionContent>
              <div>Muu esittelymateriaali</div>
              <div style={{ marginTop: "0.4rem" }}>{vuorovaikutus.suunnittelumateriaali.nimi}</div>
              <div style={{ marginTop: "0.4rem" }}>
                <Link underline="none" href={vuorovaikutus.suunnittelumateriaali.url}>
                  {vuorovaikutus.suunnittelumateriaali.url}
                </Link>
              </div>
            </SectionContent>
          )}
        </Section>
      )}
      <Section className={muokkaustila || !julkinen ? "" : "hidden"}>
        <SectionContent>
          {julkinen ? (
            <HassuStack className="mt-12" direction={["column", "column", "row"]} justifyContent="space-between">
              <h4 style={{ display: "inline" }} className="vayla-small-title">
                Suunnitelmaluonnokset ja esittelyaineistot
              </h4>
              <HassuStack direction={["column", "column", "row"]}>
                <Button
                  primary
                  type="submit"
                  onClick={(e) => {
                    e.preventDefault();
                    saveForm();
                  }}
                >
                  Päivitä
                </Button>
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    if (isDirty) reset();
                    setMuokkaustila(false);
                  }}
                >
                  Peruuta
                </Button>
              </HassuStack>
            </HassuStack>
          ) : (
            <h4 className="vayla-small-title">Suunnitelmaluonnokset ja esittelyaineistot</h4>
          )}
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
          <p>Aineistoille tulee valita kategoria / otsikko, jonka alla ne esitetään palvelun julkisella puolella. </p>
          <p>
            Aineistojen järjestys kunkin otsikon alla määräytyy listan järjestyksen mukaan. Voit vaihtaa järjestystä
            tarttumalla hiirellä raahaus-ikonista ja siirtämällä rivin paikkaa.{" "}
          </p>
          {!!expandedEsittelyAineisto.length && !!expandedSuunnitelmaLuonnokset.length && (
            <Button
              type="button"
              onClick={() => {
                setExpandedEsittelyAineisto([]);
                setExpandedSuunnitelmaLuonnokset([]);
              }}
            >
              Sulje kaikki kategoriat
            </Button>
          )}
          <HassuAccordion
            expandedState={[expandedEsittelyAineisto, setExpandedEsittelyAineisto]}
            items={[
              {
                title: `Esittelyaineisto (${esittelyaineistot?.length || 0})`,
                content: (
                  <>
                    {projekti?.oid && vuorovaikutus && !!esittelyaineistot?.length ? (
                      <AineistoTable
                        projektiOid={projekti.oid}
                        aineistoTyyppi={SuunnitteluVaiheAineistoTyyppi.ESITTELYAINEISTOT}
                        esittelyAineistotFieldArray={esittelyAineistotFieldArray}
                        suunnitelmaLuonnoksetFieldArray={suunnitelmaLuonnoksetFieldArray}
                        register={register}
                        vuorovaikutus={vuorovaikutus}
                      />
                    ) : (
                      <p>Ei esittelyaineistoa. Aloita aineistojen tuonti painamalla Tuo Aineistoja -painiketta.</p>
                    )}
                  </>
                ),
              },
            ]}
          />
          <Button type="button" onClick={() => setEsittelyAineistoDialogOpen(true)}>
            Tuo Aineistoja
          </Button>
          <AineistojenValitseminenDialog
            open={esittelyAineistoDialogOpen}
            onClose={() => setEsittelyAineistoDialogOpen(false)}
            onSubmit={(aineistot) => {
              const value = esittelyaineistot || [];
              aineistot.forEach((aineisto) => {
                if (!find(value, { dokumenttiOid: aineisto.dokumenttiOid })) {
                  value.push(aineisto);
                }
              });
              setValue("suunnitteluVaihe.vuorovaikutus.esittelyaineistot", value);
            }}
          />
          <HassuAccordion
            expandedState={[expandedSuunnitelmaLuonnokset, setExpandedSuunnitelmaLuonnokset]}
            items={[
              {
                title: `Suunnitelmaluonnokset (${suunnitelmaluonnokset?.length || 0})`,
                content: (
                  <>
                    {projekti?.oid && vuorovaikutus && !!suunnitelmaluonnokset?.length ? (
                      <AineistoTable
                        projektiOid={projekti.oid}
                        aineistoTyyppi={SuunnitteluVaiheAineistoTyyppi.SUUNNITELMALUONNOKSET}
                        esittelyAineistotFieldArray={esittelyAineistotFieldArray}
                        suunnitelmaLuonnoksetFieldArray={suunnitelmaLuonnoksetFieldArray}
                        register={register}
                        vuorovaikutus={vuorovaikutus}
                      />
                    ) : (
                      <p>Ei esittelyaineistoa. Aloita aineistojen tuonti painamalla Tuo Aineistoja -painiketta.</p>
                    )}
                  </>
                ),
              },
            ]}
          />
          <Button type="button" onClick={() => setSuunnitelmaLuonnoksetDialogOpen(true)}>
            Tuo Aineistoja
          </Button>
          <AineistojenValitseminenDialog
            open={suunnitelmaLuonnoksetDialogOpen}
            onClose={() => setSuunnitelmaLuonnoksetDialogOpen(false)}
            onSubmit={(aineistot) => {
              const value = suunnitelmaluonnokset || [];
              aineistot.forEach((aineisto) => {
                if (!find(value, { dokumenttiOid: aineisto.dokumenttiOid })) {
                  value.push(aineisto);
                }
              });
              setValue("suunnitteluVaihe.vuorovaikutus.suunnitelmaluonnokset", value);
            }}
          />
        </SectionContent>
        <SectionContent>
          <h5 className="vayla-smallest-title">Ennalta kuvattu videoesittely</h5>
          {videotFields.map((field, index) => (
            <HassuStack key={field.id} direction={"row"}>
              <TextInput
                style={{ width: "100%" }}
                key={field.id}
                {...register(`suunnitteluVaihe.vuorovaikutus.videot.${index}.url`)}
                label="Linkki videoon"
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
      </Section>
    </>
  );
}

enum SuunnitteluVaiheAineistoTyyppi {
  ESITTELYAINEISTOT = "ESITTELYAINEISTOT",
  SUUNNITELMALUONNOKSET = "SUUNNITELMALUONNOKSET",
}

type FormAineisto = FieldArrayWithId<
  VuorovaikutusFormValues,
  "suunnitteluVaihe.vuorovaikutus.esittelyaineistot",
  "id"
> &
  Pick<Aineisto, "tila" | "tuotu">;

interface AineistoTableProps {
  projektiOid: string;
  aineistoTyyppi: SuunnitteluVaiheAineistoTyyppi;
  esittelyAineistotFieldArray: UseFieldArrayReturn<
    VuorovaikutusFormValues,
    "suunnitteluVaihe.vuorovaikutus.esittelyaineistot",
    "id"
  >;
  suunnitelmaLuonnoksetFieldArray: UseFieldArrayReturn<
    VuorovaikutusFormValues,
    "suunnitteluVaihe.vuorovaikutus.suunnitelmaluonnokset",
    "id"
  >;
  register: UseFormRegister<VuorovaikutusFormValues>;
  vuorovaikutus: Vuorovaikutus;
}

const AineistoTable = ({
  projektiOid,
  aineistoTyyppi,
  suunnitelmaLuonnoksetFieldArray,
  esittelyAineistotFieldArray,
  register,
  vuorovaikutus,
}: AineistoTableProps) => {
  const { append: appendToOtherArray } =
    aineistoTyyppi === SuunnitteluVaiheAineistoTyyppi.ESITTELYAINEISTOT
      ? suunnitelmaLuonnoksetFieldArray
      : esittelyAineistotFieldArray;

  const { fields, remove } =
    aineistoTyyppi === SuunnitteluVaiheAineistoTyyppi.ESITTELYAINEISTOT
      ? esittelyAineistotFieldArray
      : suunnitelmaLuonnoksetFieldArray;

  const fieldArrayName =
    aineistoTyyppi === SuunnitteluVaiheAineistoTyyppi.ESITTELYAINEISTOT
      ? "suunnitteluVaihe.vuorovaikutus.esittelyaineistot"
      : "suunnitteluVaihe.vuorovaikutus.suunnitelmaluonnokset";

  const enrichedFields = useMemo(
    () =>
      fields.map((field) => {
        const aineistoData = [
          ...(vuorovaikutus.esittelyaineistot || []),
          ...(vuorovaikutus.suunnitelmaluonnokset || []),
        ];
        const { tila, tuotu } = aineistoData.find(({ dokumenttiOid }) => dokumenttiOid === field.dokumenttiOid) || {};

        return { tila, tuotu, ...field };
      }),
    [fields, vuorovaikutus]
  );

  const columns = useMemo<Column<FormAineisto>[]>(
    () => [
      {
        Header: "Aineisto",
        accessor: (aineisto) => {
          const index = enrichedFields.findIndex((row) => row.dokumenttiOid === aineisto.dokumenttiOid);
          return (
            <>
              <AineistoNimiExtLink
                aineistoNimi={aineisto.nimi}
                aineistoOid={aineisto.dokumenttiOid}
                projektiOid={projektiOid}
              />
              <input type="hidden" {...register(`${fieldArrayName}.${index}.dokumenttiOid`)} />
              <input type="hidden" {...register(`${fieldArrayName}.${index}.nimi`)} />
            </>
          );
        },
      },
      {
        Header: "Tuotu",
        accessor: (aineisto) => (aineisto.tuotu ? formatDateTime(aineisto.tuotu) : undefined),
      },
      {
        Header: "Kategoria",
        accessor: (aineisto) => {
          const index = enrichedFields.findIndex((row) => row.dokumenttiOid === aineisto.dokumenttiOid);
          return (
            <Select
              defaultValue={aineistoTyyppi}
              onChange={(event) => {
                const tyyppi = event.target.value as SuunnitteluVaiheAineistoTyyppi;
                if (tyyppi !== aineistoTyyppi) {
                  appendToOtherArray({ dokumenttiOid: aineisto.dokumenttiOid, nimi: aineisto.nimi });
                  remove(index);
                }
              }}
              options={[
                { label: "Esittelyaineistot", value: SuunnitteluVaiheAineistoTyyppi.ESITTELYAINEISTOT },
                { label: "Suunnitelmaluonnokset", value: SuunnitteluVaiheAineistoTyyppi.SUUNNITELMALUONNOKSET },
              ]}
            />
          );
        },
      },
      {
        Header: "Poista",
        accessor: (aineisto) => (
          <IconButton
            type="button"
            onClick={() => {
              const index = enrichedFields.findIndex((row) => row.dokumenttiOid === aineisto.dokumenttiOid);
              if (index >= 0) {
                remove(index);
              }
            }}
            icon="trash"
          />
        ),
      },
      { Header: "id", accessor: "id" },
      { Header: "dokumenttiOid", accessor: "dokumenttiOid" },
    ],
    [aineistoTyyppi, fieldArrayName, enrichedFields, projektiOid, register, remove, appendToOtherArray]
  );
  const tableProps = useHassuTable<FormAineisto>({
    tableOptions: { columns, data: enrichedFields, initialState: { hiddenColumns: ["dokumenttiOid", "id"] } },
  });
  return <HassuTable {...tableProps} />;
};
