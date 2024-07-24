import HassuTable from "@components/table/HassuTable";
import { AineistoInputNew, AineistoNew } from "@services/api";
import { ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import useTranslation from "next-translate/useTranslation";
import { useFieldArray, useFormContext } from "react-hook-form";
import { useCallback, useMemo } from "react";
import { aineistoKategoriat } from "common/aineistoKategoriat";
import HassuAineistoNimiExtLink from "@components/projekti/HassuAineistoNimiExtLink";
import Select from "@components/form/Select";
import find from "lodash/find";
import { ActionsColumn } from ".";
import { FormAineistoNew, getAllOptionsForKategoriat } from "../util";
import { HyvaksymisEsitysForm } from "@components/HyvaksymisEsitys/hyvaksymisEsitysFormUtil";

interface AineistoTableProps {
  kategoriaId: string;
  aineisto: AineistoNew[] | undefined | null;
}

export function AineistoTable(props: AineistoTableProps) {
  const { control, register, getValues, setValue } = useFormContext<HyvaksymisEsitysForm>();
  const aineistoRoute: `muokattavaHyvaksymisEsitys.suunnitelma.${string}` = `muokattavaHyvaksymisEsitys.suunnitelma.${props.kategoriaId}`;
  const { fields, remove, update: updateFieldArray, move } = useFieldArray({ name: aineistoRoute, control });

  const { t } = useTranslation("aineisto");

  const allOptions = useMemo(() => getAllOptionsForKategoriat({ kategoriat: aineistoKategoriat.listKategoriat(true), t }), [t]);

  const enrichedFields: FormAineistoNew[] = useMemo(
    () =>
      fields.map((field) => {
        const aineistoData = props.aineisto || [];
        const { tuotu, tiedosto } = aineistoData.find(({ uuid }) => uuid === field.uuid) || {};

        return { ...field, tuotu: !!tuotu, tiedosto };
      }),
    [fields, props.aineisto]
  );

  const columns = useMemo<ColumnDef<FormAineistoNew>[]>(
    () => [
      {
        header: "Aineisto",
        meta: { minWidth: 250, widthFractions: 4 },
        id: "aineisto",
        accessorFn: (aineisto) => {
          const index = enrichedFields.findIndex((row) => row.uuid === aineisto.uuid);
          return (
            <>
              <HassuAineistoNimiExtLink aineistoNimi={aineisto.nimi} tiedostoPolku={aineisto.tiedosto} />
              <input type="hidden" {...register(`${aineistoRoute}.${index}.dokumenttiOid`)} />
              <input type="hidden" {...register(`${aineistoRoute}.${index}.nimi`)} />
            </>
          );
        },
      },
      // {
      //   header: "Tuotu",
      //   id: "tuotu",
      //   accessorFn: (aineisto) =>
      //     aineisto.tila !== AineistoTila.ODOTTAA_POISTOA && (aineisto.tuotu ? formatDateTime(aineisto.tuotu) : undefined),
      //   meta: { minWidth: 120, widthFractions: 2 },
      // },
      {
        header: "Kategoria",
        id: "kategoria",
        accessorFn: (aineisto) => {
          return (
            <Select
              options={allOptions}
              defaultValue={props.kategoriaId}
              className="category_selector"
              onChange={(event) => {
                const newKategoria = event.target.value;
                if (newKategoria !== props.kategoriaId) {
                  const values: AineistoInputNew[] = getValues(`muokattavaHyvaksymisEsitys.suunnitelma.${newKategoria}`) || [];
                  const index = enrichedFields.findIndex((row) => row.uuid === aineisto.uuid);

                  if (!find(values, { uuid: aineisto.uuid })) {
                    values.push({
                      dokumenttiOid: aineisto.dokumenttiOid,
                      nimi: aineisto.nimi,
                      kategoriaId: newKategoria,
                      uuid: aineisto.uuid,
                    });
                    setValue(`muokattavaHyvaksymisEsitys.suunnitelma.${newKategoria}`, values);
                  }
                  remove(index);
                }
              }}
            />
          );
        },
        meta: { minWidth: 120, widthFractions: 2 },
      },
      {
        header: "",
        id: "actions",
        accessorFn: (aineisto) => {
          const index = fields.findIndex((row) => row.uuid === aineisto.uuid);
          return <ActionsColumn fields={fields} index={index} remove={remove} updateFieldArray={updateFieldArray} aineisto={aineisto} />;
        },
        meta: { minWidth: 120, widthFractions: 2 },
      },
    ],
    [enrichedFields, props.kategoriaId, register, aineistoRoute, allOptions, getValues, remove, setValue, fields, updateFieldArray]
  );

  const findRowIndex = useCallback((id: string) => enrichedFields.findIndex((row) => row.uuid.toString() === id), [enrichedFields]);

  const onDragAndDrop = useCallback(
    (id: string, targetRowIndex: number) => {
      move(findRowIndex(id), targetRowIndex);
    },
    [findRowIndex, move]
  );

  const table = useReactTable({
    columns,
    data: enrichedFields || [],
    getCoreRowModel: getCoreRowModel(),
    state: {
      pagination: undefined,
    },
    defaultColumn: { cell: (cell) => cell.getValue() || "-" },
    getRowId: (row) => row.uuid,
    meta: { tableId: `${props.kategoriaId}_table`, findRowIndex, onDragAndDrop, virtualization: { type: "window" } },
  });

  return <HassuTable table={table} />;
}
