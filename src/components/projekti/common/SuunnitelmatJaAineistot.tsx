import Button from "@components/button/Button";
import ButtonFlat from "@components/button/ButtonFlat";
import IconButton from "@components/button/IconButton";
import Select, { SelectOption } from "@components/form/Select";
import HassuAccordion from "@components/HassuAccordion";
import HassuTable from "@components/table/HassuTable";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import HassuAineistoNimiExtLink from "@components/projekti/HassuAineistoNimiExtLink";
import AineistojenValitseminenDialog from "@components/projekti/common/AineistojenValitseminenDialog";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Aineisto, AineistoInput, AineistoTila, HyvaksymisPaatosVaihe, NahtavillaoloVaihe } from "@services/api";
import { AineistoKategoria, aineistoKategoriat, getNestedAineistoMaaraForCategory, kategorisoimattomatId } from "common/aineistoKategoriat";
import find from "lodash/find";
import useTranslation from "next-translate/useTranslation";
import React, { ComponentProps, Key, useCallback, useMemo, useState } from "react";
import {
  FieldArrayWithId,
  UseFieldArrayRemove,
  UseFieldArrayReturn,
  useFieldArray,
  useFormContext,
  UseFieldArrayAppend,
} from "react-hook-form";
import { useProjekti } from "src/hooks/useProjekti";
import { formatDateTime } from "common/util/dateUtils";
import HyvaksymisPaatosTiedostot from "../paatos/aineistot/HyvaksymisPaatosTiedostot";
import { AineistotSaavutettavuusOhje } from "./AineistotSaavutettavuusOhje";
import { ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { MUIStyledCommonProps, styled, experimental_sx as sx } from "@mui/system";
import useTableDragConnectSourceContext from "src/hooks/useDragConnectSourceContext";
import { useIsTouchScreen } from "src/hooks/useIsTouchScreen";

interface AineistoNahtavilla {
  [kategoriaId: string]: AineistoInput[];
}

interface FormValues {
  aineistoNahtavilla: AineistoNahtavilla;
  poistetutAineistoNahtavilla: AineistoInput[];
  hyvaksymisPaatos?: AineistoInput[];
}

const kategoriaInfoText: Record<string, string> = {
  osa_a: "Selostusosan alle tuodaan A- tai T100 -kansioiden aineistot.",
  osa_b: "Pääpiirustusten alle tuodaan B- tai T200 -kansioiden aineistot.",
  osa_c: "Informatiivisen aineiston alle tuodaan C- tai T300 -kansioiden aineistot.",
  kategorisoimattomat:
    "Kategorisoimattomat alle tuodaan kaikki aineistot, joita ei pystytty automaattisesti kategorisoimaan. Aineistot tulee siirtää Selostusosan-, Pääpiirustukset- tai Informatiivinen aineisto -kategorioiden alle. Pääset siirtymään kuulutukselle vasta, kun aineistot on siirretty ja Kategorisoimattomat on tyhjä.",
};

export interface PaatosAineistoTiedot {
  paatosSubtitle: string;
  paatosInfoText: string;
}

export interface SuunnitelmatJaAineistotProps {
  dialogInfoText: string;
  sectionTitle: string;
  sectionInfoText: string;
  sectionSubtitle?: string;
  paatos?: PaatosAineistoTiedot;
  vaihe: NahtavillaoloVaihe | HyvaksymisPaatosVaihe | null | undefined;
}

function getInitialExpandedAineisto(aineistoNahtavilla: AineistoNahtavilla): Key[] {
  const keyArray = [];
  const hasKategorisoimattomatAineisto = !!aineistoNahtavilla[kategorisoimattomatId].length;
  if (hasKategorisoimattomatAineisto) {
    keyArray.push(kategorisoimattomatId);
  }
  return keyArray;
}

export default function SuunnitelmatJaAineistot({
  dialogInfoText,
  sectionTitle,
  sectionInfoText,
  paatos,
  sectionSubtitle,
  vaihe,
}: SuunnitelmatJaAineistotProps) {
  const { watch, setValue, getValues } = useFormContext<FormValues>();
  const aineistoNahtavilla = watch("aineistoNahtavilla");
  const poistetutAineistoNahtavilla = watch("poistetutAineistoNahtavilla");
  const hyvaksymisPaatos = watch("hyvaksymisPaatos");
  const aineistoNahtavillaFlat = Object.values(aineistoNahtavilla || {}).flat();
  const [expandedAineisto, setExpandedAineisto] = useState<Key[]>(getInitialExpandedAineisto(aineistoNahtavilla));

  const { t } = useTranslation("aineisto");

  const [aineistoDialogOpen, setAineistoDialogOpen] = useState(false);
  const [paatosDialogOpen, setPaatosDialogOpen] = useState(false);

  console.log({ aineistoNahtavilla, poistetutAineistoNahtavilla });

  return (
    <Section>
      <h4 className="vayla-subtitle">{sectionTitle}</h4>
      <p>{sectionInfoText}</p>
      <AineistotSaavutettavuusOhje />
      {paatos && (
        <>
          <h5 className="vayla-small-title">{paatos.paatosSubtitle}</h5>
          <p>{paatos.paatosInfoText}</p>
          {!!hyvaksymisPaatos?.length && <HyvaksymisPaatosTiedostot />}
          <Button type="button" onClick={() => setPaatosDialogOpen(true)} id="tuo_paatos_button">
            Tuo päätös
          </Button>
          <AineistojenValitseminenDialog
            open={paatosDialogOpen}
            infoText="Valitse yksi tai useampi päätöstiedosto."
            onClose={() => setPaatosDialogOpen(false)}
            onSubmit={(velhoAineistot) => {
              const value = hyvaksymisPaatos || [];
              velhoAineistot
                .filter(({ oid }) => !find(value, { dokumenttiOid: oid }))
                .map<AineistoInput>((velhoAineisto) => ({
                  dokumenttiOid: velhoAineisto.oid,
                  nimi: velhoAineisto.tiedosto,
                }))
                .forEach((uusiAineisto) => {
                  value.push({ ...uusiAineisto, jarjestys: value.length });
                });
              setValue("hyvaksymisPaatos", value, { shouldDirty: true });
            }}
          />
        </>
      )}
      {sectionSubtitle && <h5 className="vayla-small-title">{sectionSubtitle}</h5>}
      <ButtonFlat
        type="button"
        onClick={() => {
          if (!!expandedAineisto.length) {
            setExpandedAineisto([]);
          } else {
            setExpandedAineisto(aineistoKategoriat.listKategoriaIds());
          }
        }}
        iconComponent={
          <span className="fa-layers">
            <FontAwesomeIcon icon="chevron-down" transform={`down-6`} flip={!!expandedAineisto.length ? "vertical" : undefined} />
            <FontAwesomeIcon icon="chevron-up" transform={`up-6`} flip={!!expandedAineisto.length ? "vertical" : undefined} />
          </span>
        }
      >
        {!!expandedAineisto.length ? "Sulje" : "Avaa"} kaikki kategoriat
      </ButtonFlat>
      {console.log(
        getNestedAineistoMaaraForCategory(aineistoNahtavillaFlat, aineistoKategoriat.findYlakategoriaById(kategorisoimattomatId)!)
      )}
      <HassuAccordion
        expandedState={[expandedAineisto, setExpandedAineisto]}
        items={aineistoKategoriat.listKategoriat(true).map((paakategoria) => ({
          title: (
            <span className="vayla-small-title">{`${t(`aineisto-kategoria-nimi.${paakategoria.id}`)} (${getNestedAineistoMaaraForCategory(
              aineistoNahtavillaFlat,
              paakategoria
            )})`}</span>
          ),
          content: (
            <SectionContent largeGaps>
              <SuunnitelmaAineistoPaakategoriaContent
                vaihe={vaihe}
                paakategoria={paakategoria}
                expandedAineistoState={[expandedAineisto, setExpandedAineisto]}
                dialogInfoText={dialogInfoText}
              />
            </SectionContent>
          ),
          id: paakategoria.id,
        }))}
      />
      <Button type="button" id={"aineisto_nahtavilla_import_button"} onClick={() => setAineistoDialogOpen(true)}>
        Tuo Aineistot
      </Button>
      <AineistojenValitseminenDialog
        open={aineistoDialogOpen}
        infoText={dialogInfoText}
        onClose={() => setAineistoDialogOpen(false)}
        onSubmit={(valitutVelhoAineistot) => {
          const { poistetut, lisatyt } = valitutVelhoAineistot
            .map<AineistoInput>((velhoAineisto, jarjestys) => ({
              dokumenttiOid: velhoAineisto.oid,
              nimi: velhoAineisto.tiedosto,
              jarjestys,
              kategoriaId: aineistoKategoriat.findKategoria(velhoAineisto.kuvaus, velhoAineisto.tiedosto)?.id,
            }))
            .reduce<{ lisatyt: AineistoNahtavilla; poistetut: AineistoInput[] }>(
              (acc, velhoAineisto) => {
                if (!find(Object.values(acc.lisatyt || {}).flat(), { dokumenttiOid: velhoAineisto.dokumenttiOid })) {
                  if (!velhoAineisto.kategoriaId && !acc.lisatyt[kategorisoimattomatId]) {
                    acc.lisatyt[kategorisoimattomatId] = [];
                  }
                  if (velhoAineisto.kategoriaId && !acc.lisatyt[velhoAineisto.kategoriaId]) {
                    acc.lisatyt[velhoAineisto.kategoriaId] = [];
                  }
                  const kategorianAineistot = acc.lisatyt[velhoAineisto.kategoriaId || kategorisoimattomatId];
                  kategorianAineistot.push({ ...velhoAineisto, jarjestys: kategorianAineistot.length });
                }
                acc.poistetut = acc.poistetut.filter((poistettu) => poistettu.dokumenttiOid !== velhoAineisto.dokumenttiOid);
                return acc;
              },
              { lisatyt: aineistoNahtavilla || {}, poistetut: poistetutAineistoNahtavilla || [] }
            );
          setValue("poistetutAineistoNahtavilla", poistetut, { shouldDirty: true });
          setValue("aineistoNahtavilla", lisatyt, { shouldDirty: true });

          const kategorisoimattomat = getValues(`aineistoNahtavilla.${kategorisoimattomatId}`);

          if (kategorisoimattomat?.length && !expandedAineisto.includes(kategorisoimattomatId)) {
            setExpandedAineisto([...expandedAineisto, kategorisoimattomatId]);
          }
        }}
      />
    </Section>
  );
}

interface SuunnitelmaAineistoPaakategoriaContentProps {
  paakategoria: AineistoKategoria;
  expandedAineistoState: [React.Key[], React.Dispatch<React.Key[]>];
  dialogInfoText: string;
  vaihe: NahtavillaoloVaihe | HyvaksymisPaatosVaihe | null | undefined;
}

const SuunnitelmaAineistoPaakategoriaContent = (props: SuunnitelmaAineistoPaakategoriaContentProps) => {
  const { data: projekti } = useProjekti();
  const { watch } = useFormContext<FormValues>();

  const aineistoNahtavilla = watch("aineistoNahtavilla");

  return (
    <>
      <p>{kategoriaInfoText[props.paakategoria.id]}</p>
      {!!projekti?.oid && !!aineistoNahtavilla[props.paakategoria.id]?.length && (
        <AineistoTable vaihe={props.vaihe} kategoriaId={props.paakategoria.id} />
      )}
      {props.paakategoria.alaKategoriat && (
        <SuunnitelmaAineistoAlakategoriaAccordion
          vaihe={props.vaihe}
          alakategoriat={props.paakategoria.alaKategoriat}
          expandedAineistoState={props.expandedAineistoState}
        />
      )}
    </>
  );
};

interface SuunnitelmaAineistoAlakategoriaAccordionProps {
  alakategoriat: AineistoKategoria[];
  expandedAineistoState: [React.Key[], React.Dispatch<React.Key[]>];
  vaihe: NahtavillaoloVaihe | HyvaksymisPaatosVaihe | null | undefined;
}

const SuunnitelmaAineistoAlakategoriaAccordion = (props: SuunnitelmaAineistoAlakategoriaAccordionProps) => {
  const { watch } = useFormContext<FormValues>();
  const { t } = useTranslation("aineisto");
  const aineistoNahtavilla = watch("aineistoNahtavilla");
  const aineistoNahtavillaFlat = Object.values(aineistoNahtavilla || {}).flat();
  const aineistojenMaara = props.alakategoriat.reduce((acc, cur) => {
    return acc + getNestedAineistoMaaraForCategory(aineistoNahtavillaFlat, cur);
  }, 0);

  if (!aineistojenMaara) {
    return null;
  }

  return (
    <HassuAccordion
      expandedState={props.expandedAineistoState}
      items={props.alakategoriat.map((alakategoria) => ({
        title: `${t(`aineisto-kategoria-nimi.${alakategoria.id}`)} (${getNestedAineistoMaaraForCategory(
          aineistoNahtavillaFlat,
          alakategoria
        )})`,
        content: <AlakategoriaContent kategoria={alakategoria} vaihe={props.vaihe} expandedAineistoState={props.expandedAineistoState} />,
        id: alakategoria.id,
      }))}
    />
  );
};

interface AlakategoriaContentProps {
  kategoria: AineistoKategoria;
  expandedAineistoState: [React.Key[], React.Dispatch<React.Key[]>];
  vaihe: NahtavillaoloVaihe | HyvaksymisPaatosVaihe | null | undefined;
}

const AlakategoriaContent = (props: AlakategoriaContentProps) => {
  const { watch } = useFormContext<FormValues>();
  const aineistoRoute: `aineistoNahtavilla.${string}` = `aineistoNahtavilla.${props.kategoria.id}`;
  const aineistot = watch(aineistoRoute);
  return (
    <>
      {!!aineistot?.length ? (
        <AineistoTable kategoriaId={props.kategoria.id} vaihe={props.vaihe} />
      ) : (
        <p>Kategoriaan ei ole asetettu aineistoa.</p>
      )}
      {!!props.kategoria.alaKategoriat?.length && (
        <SuunnitelmaAineistoAlakategoriaAccordion
          vaihe={props.vaihe}
          expandedAineistoState={props.expandedAineistoState}
          alakategoriat={props.kategoria.alaKategoriat}
        />
      )}
    </>
  );
};

type FormAineisto = FieldArrayWithId<FormValues, `aineistoNahtavilla.${string}`, "id"> & Pick<Aineisto, "tila" | "tuotu" | "tiedosto">;

interface AineistoTableProps {
  kategoriaId: string;
  vaihe: NahtavillaoloVaihe | HyvaksymisPaatosVaihe | null | undefined;
}

const AineistoTable = (props: AineistoTableProps) => {
  const { control, formState, register, getValues, setValue } = useFormContext<FormValues>();
  const aineistoRoute: `aineistoNahtavilla.${string}` = `aineistoNahtavilla.${props.kategoriaId}`;
  const { fields, remove, update: updateFieldArray, move } = useFieldArray({ name: aineistoRoute, control });

  const { append: appendToPoistetut } = useFieldArray({ name: "poistetutAineistoNahtavilla", control });
  const { t } = useTranslation("aineisto");

  const getAllOptionsForKategoriat: (kategoriat: AineistoKategoria[], ylakategoriaNimi?: string) => SelectOption[] = useCallback(
    (kategoriat, ylakategoriaNimi) => {
      const ylakategoriaPrefix = ylakategoriaNimi ? `${ylakategoriaNimi} - ` : "";
      const kategoriaIds: SelectOption[] = [];
      kategoriat.forEach((kategoria) => {
        kategoriaIds.push({
          label: ylakategoriaPrefix + t(`aineisto-kategoria-nimi.${kategoria.id}`),
          value: kategoria.id,
        });
        if (kategoria.alaKategoriat) {
          kategoriaIds.push(
            ...getAllOptionsForKategoriat(kategoria.alaKategoriat, ylakategoriaPrefix + t(`aineisto-kategoria-nimi.${kategoria.id}`))
          );
        }
      });
      return kategoriaIds;
    },
    [t]
  );

  const allOptions = useMemo(() => getAllOptionsForKategoriat(aineistoKategoriat.listKategoriat(true)), [getAllOptionsForKategoriat]);

  const enrichedFields: FormAineisto[] = useMemo(
    () =>
      fields.map((field) => {
        const aineistoData = props.vaihe?.aineistoNahtavilla || [];
        const { tila, tuotu, tiedosto } = aineistoData.find(({ dokumenttiOid }) => dokumenttiOid === field.dokumenttiOid) || {};

        return { tila, tuotu, tiedosto, ...field };
      }),
    [fields, props.vaihe?.aineistoNahtavilla]
  );

  const columns = useMemo<ColumnDef<FormAineisto>[]>(
    () => [
      {
        header: "Aineisto",
        meta: { minWidth: 250, widthFractions: 4 },
        id: "aineisto",
        accessorFn: (aineisto) => {
          const index = enrichedFields.findIndex((row) => row.dokumenttiOid === aineisto.dokumenttiOid);
          const errorpath = props.kategoriaId;
          const errorMessage = (formState.errors.aineistoNahtavilla?.[errorpath]?.[index] as any | undefined)?.message;
          return (
            <>
              <HassuAineistoNimiExtLink aineistoNimi={aineisto.nimi} tiedostoPolku={aineisto.tiedosto} aineistoTila={aineisto.tila} />
              {errorMessage && <p className="text-red">{errorMessage}</p>}
              <input type="hidden" {...register(`${aineistoRoute}.${index}.dokumenttiOid`)} />
              <input type="hidden" {...register(`${aineistoRoute}.${index}.nimi`)} />
            </>
          );
        },
      },
      {
        header: "Tuotu",
        id: "tuotu",
        accessorFn: (aineisto) =>
          aineisto.tila !== AineistoTila.ODOTTAA_POISTOA && (aineisto.tuotu ? formatDateTime(aineisto.tuotu) : undefined),
        meta: { minWidth: 120, widthFractions: 2 },
      },
      {
        header: "Kategoria",
        id: "kategoria",
        accessorFn: (aineisto) => {
          return (
            aineisto.tila !== AineistoTila.ODOTTAA_POISTOA && (
              <Select
                options={allOptions}
                defaultValue={props.kategoriaId}
                className="category_selector"
                onChange={(event) => {
                  const newKategoria = event.target.value;
                  if (newKategoria !== props.kategoriaId) {
                    const values = getValues(`aineistoNahtavilla.${newKategoria}`) || [];
                    const index = enrichedFields.findIndex((row) => row.dokumenttiOid === aineisto.dokumenttiOid);

                    if (!find(values, { dokumenttiOid: aineisto.dokumenttiOid })) {
                      values.push({
                        dokumenttiOid: aineisto.dokumenttiOid,
                        nimi: aineisto.nimi,
                        kategoriaId: newKategoria,
                        jarjestys: values.length,
                      });
                      setValue(`aineistoNahtavilla.${newKategoria}`, values);
                    }
                    remove(index);
                  }
                }}
              />
            )
          );
        },
        meta: { minWidth: 120, widthFractions: 2 },
      },
      {
        header: "",
        id: "actions",
        accessorFn: (aineisto) => {
          const index = fields.findIndex((row) => row.dokumenttiOid === aineisto.dokumenttiOid);
          return (
            <ActionsColumn
              fields={fields}
              index={index}
              remove={remove}
              updateFieldArray={updateFieldArray}
              aineisto={aineisto}
              appendToPoistetut={appendToPoistetut}
            />
          );
        },
        meta: { minWidth: 120, widthFractions: 2 },
      },
    ],
    [
      enrichedFields,
      props.kategoriaId,
      formState.errors.aineistoNahtavilla,
      register,
      aineistoRoute,
      allOptions,
      getValues,
      remove,
      setValue,
      fields,
      updateFieldArray,
      appendToPoistetut,
    ]
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
      setValue(`aineistoNahtavilla.${props.kategoriaId}.${index}.jarjestys`, targetRowIndex);
      setValue(`aineistoNahtavilla.${props.kategoriaId}.${targetRowIndex}.jarjestys`, index);
      move(index, targetRowIndex);
    },
    [findRowIndex, move, props.kategoriaId, setValue]
  );

  const table = useReactTable({
    columns,
    data: enrichedFields || [],
    getCoreRowModel: getCoreRowModel(),
    state: {
      pagination: undefined,
    },
    defaultColumn: { cell: (cell) => cell.getValue() || "-" },
    getRowId: (row) => row.id,
    meta: { tableId: `${props.kategoriaId}_table`, findRowIndex, onDragAndDrop, virtualization: { type: "window" } },
  });
  return <HassuTable table={table} />;
};

type ActionColumnProps = {
  aineisto: FormAineisto;
  appendToPoistetut: UseFieldArrayAppend<FormValues, "poistetutAineistoNahtavilla">;
  fields: FieldArrayWithId<FormValues, `aineistoNahtavilla.${string}`, "id">[];
  index: number;
  remove: UseFieldArrayRemove;
  updateFieldArray: UseFieldArrayReturn<FormValues, `aineistoNahtavilla.${string}`>["update"];
} & MUIStyledCommonProps &
  ComponentProps<"div">;

const ActionsColumn = styled(({ index, remove, updateFieldArray, fields, aineisto, appendToPoistetut, ...props }: ActionColumnProps) => {
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
      {!isTouch && <IconButton type="button" icon="equals" ref={dragRef} />}
    </div>
  );
})(sx({ display: "flex", justifyContent: "center", gap: 2 }));
