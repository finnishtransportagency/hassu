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
  UseFieldArrayAppend,
  UseFieldArrayRemove,
  UseFieldArrayReturn,
  useFormContext,
} from "react-hook-form";
import HassuAineistoNimiExtLink from "../../HassuAineistoNimiExtLink";
import { useProjekti } from "src/hooks/useProjekti";
import { Aineisto, AineistoInput, AineistoTila, VuorovaikutusKierros, VuorovaikutusKierrosJulkaisu } from "@services/api";
import HassuAccordion from "@components/HassuAccordion";
import Select from "@components/form/Select";
import { formatDateTime } from "common/util/dateUtils";
import find from "lodash/find";
import lowerCase from "lodash/lowerCase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { defaultEmptyLokalisoituLink, SuunnittelunPerustiedotFormValues } from "../Perustiedot";
import { getKaannettavatKielet } from "common/kaannettavatKielet";
import { ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import useTableDragConnectSourceContext from "src/hooks/useDragConnectSourceContext";
import { MUIStyledCommonProps, styled, experimental_sx as sx } from "@mui/system";
import HassuTable from "../../../table/HassuTable";
import { useIsTouchScreen } from "src/hooks/useIsTouchScreen";
import MuuEsittelymateriaali from "./MuuEsittelymateriaali";

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

  const {
    fields: videotFields,
    append: appendVideot,
    remove: removeVideot,
  } = useFieldArray({
    control,
    name: "vuorovaikutusKierros.videot",
  });

  const esittelyaineistotFieldArray = useFieldArray({ name: "vuorovaikutusKierros.esittelyaineistot", control });
  const poistetutEsittelyaineistotFieldArray = useFieldArray({ name: "vuorovaikutusKierros.poistetutEsittelyaineistot", control });
  const suunnitelmaluonnoksetFieldArray = useFieldArray({ name: "vuorovaikutusKierros.suunnitelmaluonnokset", control });
  const poistetutSuunnitelmaluonnoksetFieldArray = useFieldArray({ name: "vuorovaikutusKierros.poistetutSuunnitelmaluonnokset", control });

  const esittelyaineistot = watch("vuorovaikutusKierros.esittelyaineistot");
  const suunnitelmaluonnokset = watch("vuorovaikutusKierros.suunnitelmaluonnokset");

  const poistetutEsittelyaineistot = watch("vuorovaikutusKierros.poistetutEsittelyaineistot");
  const poistetutSuunnitelmaluonnokset = watch("vuorovaikutusKierros.poistetutSuunnitelmaluonnokset");

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
                      vuorovaikutus={vuorovaikutus}
                      esittelyaineistotFieldArray={esittelyaineistotFieldArray}
                      poistetutEsittelyaineistotFieldArray={poistetutEsittelyaineistotFieldArray}
                      poistetutSuunnittelmaluonnoksetFieldArray={poistetutSuunnitelmaluonnoksetFieldArray}
                      suunnittelmaluonnoksetFieldArray={suunnitelmaluonnoksetFieldArray}
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
              title: `Suunnitelmaluonnokset (${suunnitelmaluonnokset?.length || 0})`,
              content: (
                <>
                  {projekti?.oid && !!suunnitelmaluonnokset?.length ? (
                    <AineistoTable
                      aineistoTyyppi={SuunnitteluVaiheAineistoTyyppi.SUUNNITELMALUONNOKSET}
                      vuorovaikutus={vuorovaikutus}
                      esittelyaineistotFieldArray={esittelyaineistotFieldArray}
                      poistetutEsittelyaineistotFieldArray={poistetutEsittelyaineistotFieldArray}
                      poistetutSuunnittelmaluonnoksetFieldArray={poistetutSuunnitelmaluonnoksetFieldArray}
                      suunnittelmaluonnoksetFieldArray={suunnitelmaluonnoksetFieldArray}
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
      <MuuEsittelymateriaali kielitiedot={projekti?.kielitiedot} />
      <AineistojenValitseminenDialog
        open={esittelyAineistoDialogOpen}
        infoText="Valitse tiedostot,
        jotka haluat tuoda suunnitteluvaiheeseen."
        onClose={() => setEsittelyAineistoDialogOpen(false)}
        onSubmit={(aineistot) => {
          const { poistetut, lisatyt } = aineistot
            .map<AineistoInput>((velhoAineisto) => ({
              dokumenttiOid: velhoAineisto.oid,
              nimi: velhoAineisto.tiedosto,
            }))
            .reduce<{ lisatyt: AineistoInput[]; poistetut: AineistoInput[] }>(
              (acc, velhoAineisto) => {
                if (!find(acc.lisatyt, { dokumenttiOid: velhoAineisto.dokumenttiOid })) {
                  acc.lisatyt.push({ ...velhoAineisto, jarjestys: acc.lisatyt.length });
                }
                acc.poistetut = acc.poistetut.filter((poistettu) => poistettu.dokumenttiOid !== velhoAineisto.dokumenttiOid);
                return acc;
              },
              { lisatyt: esittelyaineistot || [], poistetut: poistetutEsittelyaineistot || [] }
            );
          setValue("vuorovaikutusKierros.poistetutEsittelyaineistot", poistetut, { shouldDirty: true });
          setValue("vuorovaikutusKierros.esittelyaineistot", lisatyt, { shouldDirty: true });
        }}
      />
      <AineistojenValitseminenDialog
        open={suunnitelmaLuonnoksetDialogOpen}
        infoText="Valitse tiedostot,
        jotka haluat tuoda suunnitteluvaiheeseen."
        onClose={() => setSuunnitelmaLuonnoksetDialogOpen(false)}
        onSubmit={(aineistot) => {
          const { poistetut, lisatyt } = aineistot
            .map<AineistoInput>((velhoAineisto) => ({
              dokumenttiOid: velhoAineisto.oid,
              nimi: velhoAineisto.tiedosto,
            }))
            .reduce<{ lisatyt: AineistoInput[]; poistetut: AineistoInput[] }>(
              (acc, velhoAineisto) => {
                if (!find(acc.lisatyt, { dokumenttiOid: velhoAineisto.dokumenttiOid })) {
                  acc.lisatyt.push({ ...velhoAineisto, jarjestys: acc.lisatyt.length });
                }
                acc.poistetut = acc.poistetut.filter((poistettu) => poistettu.dokumenttiOid !== velhoAineisto.dokumenttiOid);
                return acc;
              },
              { lisatyt: suunnitelmaluonnokset || [], poistetut: poistetutSuunnitelmaluonnokset || [] }
            );
          setValue("vuorovaikutusKierros.poistetutSuunnitelmaluonnokset", poistetut, { shouldDirty: true });
          setValue("vuorovaikutusKierros.suunnitelmaluonnokset", lisatyt, { shouldDirty: true });
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
  esittelyaineistotFieldArray: UseFieldArrayReturn<SuunnittelunPerustiedotFormValues, "vuorovaikutusKierros.esittelyaineistot", "id">;
  poistetutEsittelyaineistotFieldArray: UseFieldArrayReturn<
    SuunnittelunPerustiedotFormValues,
    "vuorovaikutusKierros.poistetutEsittelyaineistot",
    "id"
  >;
  suunnittelmaluonnoksetFieldArray: UseFieldArrayReturn<
    SuunnittelunPerustiedotFormValues,
    "vuorovaikutusKierros.suunnitelmaluonnokset",
    "id"
  >;
  poistetutSuunnittelmaluonnoksetFieldArray: UseFieldArrayReturn<
    SuunnittelunPerustiedotFormValues,
    "vuorovaikutusKierros.poistetutSuunnitelmaluonnokset",
    "id"
  >;
  vuorovaikutus:
    | Pick<VuorovaikutusKierros | VuorovaikutusKierrosJulkaisu, "suunnitelmaluonnokset" | "esittelyaineistot">
    | null
    | undefined;
}

const AineistoTable = ({
  aineistoTyyppi,
  vuorovaikutus,
  esittelyaineistotFieldArray: esittelyAineistotFieldArray,
  poistetutEsittelyaineistotFieldArray: poistetutEsittelyAineistotFieldArray,
  poistetutSuunnittelmaluonnoksetFieldArray,
  suunnittelmaluonnoksetFieldArray,
}: AineistoTableProps) => {
  const { watch, setValue } = useFormContext<SuunnittelunPerustiedotFormValues>();

  const {
    fields,
    remove,
    move,
    update: updateFieldArray,
  } = aineistoTyyppi === SuunnitteluVaiheAineistoTyyppi.ESITTELYAINEISTOT ? esittelyAineistotFieldArray : suunnittelmaluonnoksetFieldArray;
  const { append: appendToPoistetut } =
    aineistoTyyppi === SuunnitteluVaiheAineistoTyyppi.ESITTELYAINEISTOT
      ? poistetutEsittelyAineistotFieldArray
      : poistetutSuunnittelmaluonnoksetFieldArray;
  const { append: appendToOtherArray } =
    aineistoTyyppi === SuunnitteluVaiheAineistoTyyppi.ESITTELYAINEISTOT ? suunnittelmaluonnoksetFieldArray : esittelyAineistotFieldArray;

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
      fields.map((field) => {
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
                    appendToOtherArray({
                      dokumenttiOid: aineisto.dokumenttiOid,
                      nimi: aineisto.nimi,
                      tila: aineisto.tila,
                      jarjestys: otherAineistoWatch?.length,
                    });
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
          return (
            <ActionsColumn
              index={index}
              remove={remove}
              aineisto={aineisto}
              updateFieldArray={updateFieldArray}
              appendToPoistetut={appendToPoistetut}
            />
          );
        },
        meta: { minWidth: 120 },
      },
    ],
    [fields, aineistoTyyppi, otherAineistoWatch, remove, appendToOtherArray, updateFieldArray, appendToPoistetut]
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
  aineisto: FormAineisto;
  appendToPoistetut: UseFieldArrayAppend<
    SuunnittelunPerustiedotFormValues,
    "vuorovaikutusKierros.poistetutSuunnitelmaluonnokset" | "vuorovaikutusKierros.poistetutEsittelyaineistot"
  >;
  index: number;
  remove: UseFieldArrayRemove;
  updateFieldArray:
    | UseFieldArrayReturn<SuunnittelunPerustiedotFormValues, "vuorovaikutusKierros.suunnitelmaluonnokset">["update"]
    | UseFieldArrayReturn<SuunnittelunPerustiedotFormValues, "vuorovaikutusKierros.esittelyaineistot">["update"];
} & MUIStyledCommonProps &
  ComponentProps<"div">;

const ActionsColumn = styled(({ index, remove, updateFieldArray, aineisto, appendToPoistetut, ...props }: ActionColumnProps) => {
  const dragRef = useTableDragConnectSourceContext();
  const isTouch = useIsTouchScreen();
  return (
    <div {...props}>
      <IconButton
        type="button"
        onClick={() => {
          remove(index);
          if (aineisto.tila) {
            appendToPoistetut({ dokumenttiOid: aineisto.dokumenttiOid, tila: AineistoTila.ODOTTAA_POISTOA, nimi: aineisto.nimi });
          }
        }}
        icon="trash"
      />
      {!isTouch && <IconButton sx={{ touchAction: "none" }} icon="equals" type="button" ref={dragRef} />}
    </div>
  );
})(sx({ display: "flex", justifyContent: "center", gap: 2 }));
