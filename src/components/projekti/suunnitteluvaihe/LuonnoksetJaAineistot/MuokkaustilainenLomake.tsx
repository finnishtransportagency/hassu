import ContentSpacer from "@components/layout/ContentSpacer";
import { ComponentProps, Key, useCallback, useMemo, useState } from "react";
import Button from "@components/button/Button";
import ButtonFlat from "@components/button/ButtonFlat";
import TextInput from "@components/form/TextInput";
import AineistojenValitseminenDialog from "../../common/AineistojenValitseminenDialog";
import IconButton from "@components/button/IconButton";
import HassuStack from "@components/layout/HassuStack";
import {
  FieldArrayWithId,
  useFieldArray,
  UseFieldArrayRemove,
  UseFieldArrayReturn,
  useFormContext,
  UseFormRegister,
  UseFormWatch,
} from "react-hook-form";
import HassuAineistoNimiExtLink from "../../HassuAineistoNimiExtLink";
import { useProjekti } from "src/hooks/useProjekti";
import { Aineisto, AineistoInput, AineistoTila, VuorovaikutusKierros, VuorovaikutusKierrosJulkaisu } from "@services/api";
import HassuTable from "@components/HassuTable2";
import HassuAccordion from "@components/HassuAccordion";
import Select from "@components/form/Select";
import { formatDateTime } from "common/util/dateUtils";
import find from "lodash/find";
import lowerCase from "lodash/lowerCase";
import omit from "lodash/omit";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { defaultEmptyLokalisoituLink, SuunnittelunPerustiedotFormValues } from "../Perustiedot";
import { getKaannettavatKielet } from "common/kaannettavatKielet";
import { ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import useDragConnectSourceContext from "src/hooks/useDragConnectSourceContext";
import { MUIStyledCommonProps, styled, experimental_sx as sx } from "@mui/system";

interface Props {
  vuorovaikutus:
    | Pick<VuorovaikutusKierros | VuorovaikutusKierrosJulkaisu, "suunnitelmaluonnokset" | "esittelyaineistot">
    | null
    | undefined;
  hidden: boolean;
}

export default function MuokkaustilainenLomake({ vuorovaikutus, hidden }: Props) {
  const { data: projekti } = useProjekti();
  const [expandedEsittelyAineisto, setExpandedEsittelyAineisto] = useState<Key[]>([]);
  const [expandedSuunnitelmaLuonnokset, setExpandedSuunnitelmaLuonnokset] = useState<Key[]>([]);
  const [esittelyAineistoDialogOpen, setEsittelyAineistoDialogOpen] = useState(false);
  const [suunnitelmaLuonnoksetDialogOpen, setSuunnitelmaLuonnoksetDialogOpen] = useState(false);

  const { control, register, formState, watch, setValue, trigger } = useFormContext<SuunnittelunPerustiedotFormValues>();

  const esittelyAineistotFieldArray = useFieldArray({
    control,
    name: "vuorovaikutusKierros.esittelyaineistot",
  });

  const suunnitelmaLuonnoksetFieldArray = useFieldArray({
    control,
    name: "vuorovaikutusKierros.suunnitelmaluonnokset",
  });

  const {
    fields: videotFields,
    append: appendVideot,
    remove: removeVideot,
  } = useFieldArray({
    control,
    name: "vuorovaikutusKierros.videot",
  });

  const esittelyaineistot = watch("vuorovaikutusKierros.esittelyaineistot")?.filter(
    (aineisto) => aineisto.tila !== AineistoTila.ODOTTAA_POISTOA
  );
  const suunnitelmaluonnokset = watch("vuorovaikutusKierros.suunnitelmaluonnokset")?.filter(
    (aineisto) => aineisto.tila !== AineistoTila.ODOTTAA_POISTOA
  );

  const { ensisijainenKaannettavaKieli, toissijainenKaannettavaKieli } = getKaannettavatKielet(projekti?.kielitiedot);

  const areAineistoKategoriesExpanded = !!expandedEsittelyAineisto.length || !!expandedSuunnitelmaLuonnokset.length;

  return (
    <ContentSpacer className={hidden ? "hidden" : ""} gap={7}>
      <ContentSpacer>
        <h5 className="vayla-smallest-title">Suunnitelmaluonnokset ja esittelyaineistot</h5>
        <p>Aineistoille tulee valita kategoria / otsikko, jonka alla ne esitetään palvelun julkisella puolella.</p>
        <p>Aineistojen järjestys kunkin otsikon alla määräytyy listan järjestyksen mukaan.</p>
        <ButtonFlat
          type="button"
          onClick={() => {
            if (areAineistoKategoriesExpanded) {
              setExpandedEsittelyAineisto([]);
              setExpandedSuunnitelmaLuonnokset([]);
            } else {
              setExpandedEsittelyAineisto([0]);
              setExpandedSuunnitelmaLuonnokset([0]);
            }
          }}
          iconComponent={
            <span className="fa-layers">
              <FontAwesomeIcon icon="chevron-down" transform={`down-6`} flip={areAineistoKategoriesExpanded ? "vertical" : undefined} />
              <FontAwesomeIcon icon="chevron-up" transform={`up-6`} flip={areAineistoKategoriesExpanded ? "vertical" : undefined} />
            </span>
          }
        >
          {areAineistoKategoriesExpanded ? "Sulje" : "Avaa"} kaikki kategoriat
        </ButtonFlat>
        <HassuAccordion
          expandedState={[expandedEsittelyAineisto, setExpandedEsittelyAineisto]}
          items={[
            {
              title: `Esittelyaineisto (${esittelyaineistot?.length || 0})`,
              content: (
                <>
                  {projekti?.oid && !!esittelyaineistot?.length ? (
                    <AineistoTable
                      aineistoTyyppi={SuunnitteluVaiheAineistoTyyppi.ESITTELYAINEISTOT}
                      esittelyAineistotFieldArray={esittelyAineistotFieldArray}
                      suunnitelmaLuonnoksetFieldArray={suunnitelmaLuonnoksetFieldArray}
                      register={register}
                      watch={watch}
                      vuorovaikutus={vuorovaikutus}
                    />
                  ) : (
                    <p>Ei aineistoa. Aloita aineistojen tuonti painamalla Tuo Aineistoja -painiketta.</p>
                  )}
                </>
              ),
            },
          ]}
        />
        <Button type="button" id="select_esittelyaineistot_button" onClick={() => setEsittelyAineistoDialogOpen(true)}>
          Tuo Aineistoja
        </Button>
        <HassuAccordion
          expandedState={[expandedSuunnitelmaLuonnokset, setExpandedSuunnitelmaLuonnokset]}
          items={[
            {
              title: `Suunnitelmaluonnokset (${
                suunnitelmaluonnokset?.filter((aineisto) => aineisto.tila !== AineistoTila.ODOTTAA_POISTOA).length || 0
              })`,
              content: (
                <>
                  {projekti?.oid && !!suunnitelmaluonnokset?.length ? (
                    <AineistoTable
                      aineistoTyyppi={SuunnitteluVaiheAineistoTyyppi.SUUNNITELMALUONNOKSET}
                      esittelyAineistotFieldArray={esittelyAineistotFieldArray}
                      suunnitelmaLuonnoksetFieldArray={suunnitelmaLuonnoksetFieldArray}
                      register={register}
                      watch={watch}
                      vuorovaikutus={vuorovaikutus}
                    />
                  ) : (
                    <p>Ei aineistoa. Aloita aineistojen tuonti painamalla Tuo Aineistoja -painiketta.</p>
                  )}
                </>
              ),
            },
          ]}
        />
        <Button type="button" id="select_suunnitelmaluonnokset_button" onClick={() => setSuunnitelmaLuonnoksetDialogOpen(true)}>
          Tuo Aineistoja
        </Button>
      </ContentSpacer>
      <ContentSpacer>
        <h5 className="vayla-smallest-title">Ennalta kuvattu videoesittely</h5>
        <p>
          Ennalta kuvatun videoesittelyn lisääminen on vapaaehtoista. Esittelyvideo tulee olla ladattuna erilliseen videojulkaisupalveluun
          (esim. Youtube) ja videon katselulinkki tuodaan sille tarkoitettuun kenttään.
        </p>
        {videotFields.map((field, index) => (
          <HassuStack key={field.id} direction={"row"}>
            {ensisijainenKaannettavaKieli && (
              <TextInput
                style={{ width: "100%" }}
                key={field.id + ensisijainenKaannettavaKieli}
                {...register(`vuorovaikutusKierros.videot.${index}.${ensisijainenKaannettavaKieli}.url`, {
                  onChange: () => {
                    if (toissijainenKaannettavaKieli) {
                      trigger(`vuorovaikutusKierros.videot.${index}.${toissijainenKaannettavaKieli}.url`);
                    }
                  },
                })}
                label={`Linkki videoon ensisijaisella kielellä ${lowerCase(ensisijainenKaannettavaKieli)}`}
                error={(formState.errors as any)?.vuorovaikutusKierros?.videot?.[index]?.[ensisijainenKaannettavaKieli]?.url}
              />
            )}

            {toissijainenKaannettavaKieli && ensisijainenKaannettavaKieli && (
              <TextInput
                style={{ width: "100%" }}
                key={field.id + toissijainenKaannettavaKieli}
                {...register(`vuorovaikutusKierros.videot.${index}.${toissijainenKaannettavaKieli}.url`, {
                  onChange: () => {
                    trigger(`vuorovaikutusKierros.videot.${index}.${ensisijainenKaannettavaKieli}.url`);
                  },
                })}
                label={`Linkki videoon toissijaisella kielellä ${lowerCase(toissijainenKaannettavaKieli)}`}
                error={(formState.errors as any)?.vuorovaikutusKierros?.videot?.[index]?.[toissijainenKaannettavaKieli]?.url}
              />
            )}
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
          id="append_videoesittelyt_button"
          onClick={(event) => {
            event.preventDefault();
            appendVideot(defaultEmptyLokalisoituLink(null, projekti?.kielitiedot));
          }}
        >
          Lisää uusi +
        </Button>
      </ContentSpacer>
      <ContentSpacer>
        <h5 className="vayla-smallest-title">Muut esittelymateriaalit</h5>
        <p>
          Muu esittelymateraali on järjestelmän ulkopuolelle julkaistua suunnitelmaan liittyvää materiaalia. Muun esittelymateriaalin
          lisääminen on vapaaehtoista.
        </p>
        {ensisijainenKaannettavaKieli && (
          <div>
            <TextInput
              style={{ width: "100%" }}
              label={`Linkin kuvaus ensisijaisella kielellä (${lowerCase(ensisijainenKaannettavaKieli)})`}
              {...register(`vuorovaikutusKierros.suunnittelumateriaali.${ensisijainenKaannettavaKieli}.nimi`, {
                onChange: () => {
                  trigger(`vuorovaikutusKierros.suunnittelumateriaali.${ensisijainenKaannettavaKieli}.url`);
                  if (toissijainenKaannettavaKieli) {
                    trigger(`vuorovaikutusKierros.suunnittelumateriaali.${toissijainenKaannettavaKieli}`);
                  }
                },
              })}
              error={(formState.errors as any)?.vuorovaikutusKierros?.suunnittelumateriaali?.[ensisijainenKaannettavaKieli]?.nimi}
            />
            <TextInput
              style={{ width: "100%" }}
              label={`Linkki muihin esittelyaineistoihin ensisijaisella kielellä (${lowerCase(ensisijainenKaannettavaKieli)})`}
              {...register(`vuorovaikutusKierros.suunnittelumateriaali.${ensisijainenKaannettavaKieli}.url`, {
                onChange: () => {
                  trigger(`vuorovaikutusKierros.suunnittelumateriaali.${ensisijainenKaannettavaKieli}.nimi`);
                  if (toissijainenKaannettavaKieli) {
                    trigger(`vuorovaikutusKierros.suunnittelumateriaali.${toissijainenKaannettavaKieli}`);
                  }
                },
              })}
              error={(formState.errors as any)?.vuorovaikutusKierros?.suunnittelumateriaali?.[ensisijainenKaannettavaKieli]?.url}
            />
          </div>
        )}

        {toissijainenKaannettavaKieli && ensisijainenKaannettavaKieli && (
          <div>
            <TextInput
              style={{ width: "100%" }}
              label={`Linkin kuvaus toissijaisella kielellä (${lowerCase(toissijainenKaannettavaKieli)})`}
              {...register(`vuorovaikutusKierros.suunnittelumateriaali.${toissijainenKaannettavaKieli}.nimi`, {
                onChange: () => {
                  trigger(`vuorovaikutusKierros.suunnittelumateriaali.${toissijainenKaannettavaKieli}.url`);
                  trigger(`vuorovaikutusKierros.suunnittelumateriaali.${ensisijainenKaannettavaKieli}`);
                },
              })}
              error={(formState.errors as any)?.vuorovaikutusKierros?.suunnittelumateriaali?.[toissijainenKaannettavaKieli]?.nimi}
            />
            <TextInput
              style={{ width: "100%" }}
              label={`Linkki muihin esittelyaineistoihin toissijaisella kielellä (${lowerCase(toissijainenKaannettavaKieli)})`}
              {...register(`vuorovaikutusKierros.suunnittelumateriaali.${toissijainenKaannettavaKieli}.url`, {
                onChange: () => {
                  trigger(`vuorovaikutusKierros.suunnittelumateriaali.${toissijainenKaannettavaKieli}.nimi`);
                  trigger(`vuorovaikutusKierros.suunnittelumateriaali.${ensisijainenKaannettavaKieli}`);
                },
              })}
              error={(formState.errors as any)?.vuorovaikutusKierros?.suunnittelumateriaali?.[toissijainenKaannettavaKieli]?.url}
            />
          </div>
        )}
      </ContentSpacer>
      <AineistojenValitseminenDialog
        open={esittelyAineistoDialogOpen}
        infoText="Valitse tiedostot,
        jotka haluat tuoda suunnitteluvaiheeseen."
        onClose={() => setEsittelyAineistoDialogOpen(false)}
        onSubmit={(aineistot) => {
          const value = esittelyaineistot || [];
          aineistot
            .filter((velhoAineisto) => !find(value, { dokumenttiOid: velhoAineisto.oid }))
            .map<AineistoInput>((velhoAineisto, jarjestys) => ({
              dokumenttiOid: velhoAineisto.oid,
              nimi: velhoAineisto.tiedosto,
              jarjestys,
            }))
            .forEach((aineisto) => {
              value.push(aineisto);
            });
          setValue("vuorovaikutusKierros.esittelyaineistot", value, { shouldDirty: true });
        }}
      />
      <AineistojenValitseminenDialog
        open={suunnitelmaLuonnoksetDialogOpen}
        infoText="Valitse tiedostot,
        jotka haluat tuoda suunnitteluvaiheeseen."
        onClose={() => setSuunnitelmaLuonnoksetDialogOpen(false)}
        onSubmit={(aineistot) => {
          const value = suunnitelmaluonnokset || [];
          aineistot
            .filter((velhoAineisto) => !find(value, { dokumenttiOid: velhoAineisto.oid }))
            .map<AineistoInput>((velhoAineisto) => ({ dokumenttiOid: velhoAineisto.oid, nimi: velhoAineisto.tiedosto }))
            .forEach((aineisto) => {
              value.push(aineisto);
            });
          setValue("vuorovaikutusKierros.suunnitelmaluonnokset", value, { shouldDirty: true });
        }}
      />
    </ContentSpacer>
  );
}

enum SuunnitteluVaiheAineistoTyyppi {
  ESITTELYAINEISTOT = "ESITTELYAINEISTOT",
  SUUNNITELMALUONNOKSET = "SUUNNITELMALUONNOKSET",
}

type FormAineisto = FieldArrayWithId<SuunnittelunPerustiedotFormValues, "vuorovaikutusKierros.esittelyaineistot", "id"> &
  Pick<Aineisto, "tila" | "tuotu" | "tiedosto">;

interface AineistoTableProps {
  aineistoTyyppi: SuunnitteluVaiheAineistoTyyppi;
  esittelyAineistotFieldArray: UseFieldArrayReturn<SuunnittelunPerustiedotFormValues, "vuorovaikutusKierros.esittelyaineistot", "id">;
  suunnitelmaLuonnoksetFieldArray: UseFieldArrayReturn<
    SuunnittelunPerustiedotFormValues,
    "vuorovaikutusKierros.suunnitelmaluonnokset",
    "id"
  >;
  register: UseFormRegister<SuunnittelunPerustiedotFormValues>;
  watch: UseFormWatch<SuunnittelunPerustiedotFormValues>;
  vuorovaikutus:
    | Pick<VuorovaikutusKierros | VuorovaikutusKierrosJulkaisu, "suunnitelmaluonnokset" | "esittelyaineistot">
    | null
    | undefined;
}

const AineistoTable = ({
  aineistoTyyppi,
  suunnitelmaLuonnoksetFieldArray,
  esittelyAineistotFieldArray,
  vuorovaikutus,
}: AineistoTableProps) => {
  const { watch, setValue } = useFormContext<SuunnittelunPerustiedotFormValues>();

  const { append: appendToOtherArray } =
    aineistoTyyppi === SuunnitteluVaiheAineistoTyyppi.ESITTELYAINEISTOT ? suunnitelmaLuonnoksetFieldArray : esittelyAineistotFieldArray;

  const {
    fields,
    remove,
    move,
    update: updateFieldArray,
  } = aineistoTyyppi === SuunnitteluVaiheAineistoTyyppi.ESITTELYAINEISTOT ? esittelyAineistotFieldArray : suunnitelmaLuonnoksetFieldArray;

  const fieldArrayName =
    aineistoTyyppi === SuunnitteluVaiheAineistoTyyppi.ESITTELYAINEISTOT
      ? "vuorovaikutusKierros.esittelyaineistot"
      : "vuorovaikutusKierros.suunnitelmaluonnokset";

  const otherFieldArrayName =
    aineistoTyyppi === SuunnitteluVaiheAineistoTyyppi.ESITTELYAINEISTOT
      ? "vuorovaikutusKierros.suunnitelmaluonnokset"
      : "vuorovaikutusKierros.esittelyaineistot";

  const enrichedFields = useMemo(
    () =>
      fields
        .filter((field) => field.tila !== AineistoTila.ODOTTAA_POISTOA)
        .map((field) => {
          const aineistoData = [...(vuorovaikutus?.esittelyaineistot || []), ...(vuorovaikutus?.suunnitelmaluonnokset || [])];
          const { tila, tuotu, tiedosto } = aineistoData.find(({ dokumenttiOid }) => dokumenttiOid === field.dokumenttiOid) || {};

          return { tila, tuotu, tiedosto, ...field };
        }),
    [fields, vuorovaikutus]
  );

  const otherAineistoWatch = watch(otherFieldArrayName);

  const columns = useMemo<ColumnDef<FormAineisto>[]>(
    () => [
      {
        header: "Aineisto",
        meta: {
          minWidth: 250,
          widthFractions: 3,
        },
        id: "aineisto",
        accessorFn: (aineisto) => <HassuAineistoNimiExtLink aineistoNimi={aineisto.nimi} tiedostoPolku={aineisto.tiedosto} />,
      },
      {
        header: "Tuotu",
        id: "tuotu",
        accessorFn: (aineisto) =>
          aineisto.tila !== AineistoTila.ODOTTAA_POISTOA && (aineisto.tuotu ? formatDateTime(aineisto.tuotu) : undefined),
        meta: { widthFractions: 2 },
      },
      {
        header: "Kategoria",
        id: "kategoria",
        accessorFn: (aineisto) => {
          const index = fields.findIndex((row) => row.dokumenttiOid === aineisto.dokumenttiOid);
          return (
            <Select
              defaultValue={aineistoTyyppi}
              onChange={(event) => {
                const tyyppi = event.target.value as SuunnitteluVaiheAineistoTyyppi;
                if (tyyppi !== aineistoTyyppi) {
                  if (!find(otherAineistoWatch, { dokumenttiOid: aineisto.dokumenttiOid })) {
                    appendToOtherArray({ dokumenttiOid: aineisto.dokumenttiOid, nimi: aineisto.nimi });
                  }
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
        meta: { widthFractions: 2, minWidth: 220 },
      },
      {
        header: "",
        id: "actions",
        accessorFn: (aineisto) => {
          const index = fields.findIndex((row) => row.dokumenttiOid === aineisto.dokumenttiOid);
          return <ActionsColumn fields={fields} index={index} remove={remove} updateFieldArray={updateFieldArray} sx={{}} />;
        },
        meta: { minWidth: 120 },
      },
    ],
    [aineistoTyyppi, appendToOtherArray, otherAineistoWatch, fields, updateFieldArray, remove]
  );

  const findRowIndex = useCallback(
    (id: string) => {
      return enrichedFields.findIndex((row) => row.id.toString() === id);
    },
    [enrichedFields]
  );

  const onDragAndDrop = useCallback(
    (id: string, targetRowIndex: number) => {
      const index = findRowIndex(id);
      setValue(`${fieldArrayName}.${index}.jarjestys`, targetRowIndex);
      setValue(`${fieldArrayName}.${targetRowIndex}.jarjestys`, index);
      move(index, targetRowIndex);
    },
    [fieldArrayName, findRowIndex, move, setValue]
  );

  const table = useReactTable({
    columns,
    data: enrichedFields,
    getCoreRowModel: getCoreRowModel(),
    defaultColumn: { cell: (cell) => cell.getValue() || "-" },
    getRowId: (row) => row.id,
    state: { pagination: undefined },
    enableSorting: false,
    meta: { onDragAndDrop, findRowIndex, virtualization: { type: "window" } },
  });

  return <HassuTable table={table} />;
};

type ActionColumnProps = {
  fields:
    | FieldArrayWithId<SuunnittelunPerustiedotFormValues, "vuorovaikutusKierros.suunnitelmaluonnokset", "id">[]
    | FieldArrayWithId<SuunnittelunPerustiedotFormValues, "vuorovaikutusKierros.esittelyaineistot", "id">[];
  index: number;
  remove: UseFieldArrayRemove;
  updateFieldArray:
    | UseFieldArrayReturn<SuunnittelunPerustiedotFormValues, "vuorovaikutusKierros.suunnitelmaluonnokset">["update"]
    | UseFieldArrayReturn<SuunnittelunPerustiedotFormValues, "vuorovaikutusKierros.esittelyaineistot">["update"];
} & MUIStyledCommonProps &
  ComponentProps<"div">;

const ActionsColumn = styled(({ index, remove, updateFieldArray, fields, ...props }: ActionColumnProps) => {
  const dragRef = useDragConnectSourceContext();
  return (
    <div {...props}>
      <IconButton
        type="button"
        onClick={() => {
          const field = omit(fields[index], "id");
          if (!field.tila) {
            remove(index);
          } else {
            field.tila = AineistoTila.ODOTTAA_POISTOA;
            updateFieldArray(index, field);
          }
        }}
        icon="trash"
      />
      <IconButton icon="equals" ref={dragRef} />
    </div>
  );
})(sx({ display: "flex", justifyContent: "center", gap: 2 }));
