import HassuTable from "@components/table/HassuTable";
import { Aineisto, AineistoInput, AineistoTila } from "@services/api";
import { ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import useTranslation from "next-translate/useTranslation";
import { useFieldArray, useFormContext } from "react-hook-form";
import { useCallback, useMemo } from "react";
import { aineistoKategoriat } from "common/aineistoKategoriat";
import HassuAineistoNimiExtLink from "@components/projekti/HassuAineistoNimiExtLink";
import { formatDateTime } from "common/util/dateUtils";
import Select from "@components/form/Select";
import find from "lodash/find";
import { ActionsColumn } from ".";
import { FormAineisto, AineistoNahtavillaTableFormValuesInterface, getAllOptionsForKategoriat } from "../util";

interface AineistoTableProps {
  kategoriaId: string;
  aineisto: Aineisto[] | undefined | null;
}

export function AineistoTable(props: AineistoTableProps) {
  const { control, formState, register, getValues, setValue } = useFormContext<AineistoNahtavillaTableFormValuesInterface>();
  const aineistoRoute: `aineistoNahtavilla.${string}` = `aineistoNahtavilla.${props.kategoriaId}`;
  const { fields, remove, update: updateFieldArray, move } = useFieldArray({ name: aineistoRoute, control });

  const { append: appendToPoistetut } = useFieldArray({ name: "poistetutAineistoNahtavilla", control });
  const { t } = useTranslation("aineisto");

  const allOptions = useMemo(() => getAllOptionsForKategoriat({ kategoriat: aineistoKategoriat.listKategoriat(true), t }), [t]);

  const enrichedFields: FormAineisto[] = useMemo(
    () =>
      fields.map((field) => {
        const aineistoData = props.aineisto || [];
        const { tila, tuotu, tiedosto } = aineistoData.find(({ dokumenttiOid }) => dokumenttiOid === field.dokumenttiOid) || {};

        return { ...field, tila: tila ?? AineistoTila.ODOTTAA_TUONTIA, tuotu, tiedosto };
      }),
    [fields, props.aineisto]
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
                    const values: AineistoInput[] = getValues(`aineistoNahtavilla.${newKategoria}`) || [];
                    const index = enrichedFields.findIndex((row) => row.dokumenttiOid === aineisto.dokumenttiOid);

                    if (!find(values, { dokumenttiOid: aineisto.dokumenttiOid })) {
                      values.push({
                        dokumenttiOid: aineisto.dokumenttiOid,
                        nimi: aineisto.nimi,
                        kategoriaId: newKategoria,
                        jarjestys: values.length,
                        tila: aineisto.tila,
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
}
