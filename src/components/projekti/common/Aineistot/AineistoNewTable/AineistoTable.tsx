import HassuTable from "@components/table/HassuTable";
import { ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import useTranslation from "next-translate/useTranslation";
import { useFieldArray, useFormContext } from "react-hook-form";
import { useCallback, useMemo } from "react";
import { aineistoKategoriat, kategorisoimattomatId } from "common/aineistoKategoriat";
import HassuAineistoNimiExtLink from "@components/projekti/HassuAineistoNimiExtLink";
import { ActionsColumn } from ".";
import { FormAineistoNew, getAllOptionsForKategoriat } from "../util";
import { HyvaksymisEsitysForm } from "@components/HyvaksymisEsitys/hyvaksymisEsitysFormUtil";
import { formatDateTime } from "common/util/dateUtils";
import HassuMuiSelect from "@components/form/HassuMuiSelect";
import { MenuItem } from "@mui/material";

interface AineistoTableProps {
  kategoriaId: string;
}

export function AineistoTable(props: AineistoTableProps) {
  const { control, register, getValues, setValue } = useFormContext<HyvaksymisEsitysForm>();
  const aineistoRoute: `muokattavaHyvaksymisEsitys.suunnitelma.${string}` = `muokattavaHyvaksymisEsitys.suunnitelma.${props.kategoriaId}`;
  const { fields, remove, move } = useFieldArray({ name: aineistoRoute, control });

  const { t } = useTranslation("aineisto");

  const allOptions = useMemo(() => getAllOptionsForKategoriat({ kategoriat: aineistoKategoriat.listKategoriat(true), t }), [t]);

  const columns = useMemo<ColumnDef<FormAineistoNew>[]>(
    () => [
      {
        header: "Aineisto",
        meta: { minWidth: 250, widthFractions: 4 },
        id: "aineisto",
        accessorFn: (aineisto, index) => (
          <>
            <HassuAineistoNimiExtLink aineistoNimi={aineisto.nimi} tiedostoPolku={aineisto.tiedosto} />
            <input type="hidden" {...register(`${aineistoRoute}.${index}.dokumenttiOid`)} />
            <input type="hidden" {...register(`${aineistoRoute}.${index}.nimi`)} />
          </>
        ),
      },
      {
        header: "Tuotu",
        id: "tuotu",
        accessorFn: (aineisto) => (aineisto.tuotu ? formatDateTime(aineisto.tuotu) : undefined),
        meta: { minWidth: 120, widthFractions: 2 },
      },
      {
        header: "Kategoria",
        id: "kategoria",
        accessorFn: (aineisto, index) => (
          <HassuMuiSelect
            name={`${aineistoRoute}.${index}.kategoriaId`}
            control={control}
            noEmptyOption
            defaultValue={aineisto.kategoriaId ?? kategorisoimattomatId}
            onChange={(event) => {
              const newKategoria = event.target.value;
              if (newKategoria !== props.kategoriaId) {
                const values = getValues(`muokattavaHyvaksymisEsitys.suunnitelma.${newKategoria}`) || [];
                setValue(`muokattavaHyvaksymisEsitys.suunnitelma.${newKategoria}`, [
                  ...values,
                  {
                    ...aineisto,
                    kategoriaId: newKategoria,
                  },
                ]);
                remove(index);
              }
            }}
          >
            {allOptions.map((option) => (
              <MenuItem key={option.label} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </HassuMuiSelect>
        ),
        meta: { minWidth: 120, widthFractions: 2 },
      },
      {
        header: "",
        id: "actions",
        accessorFn: (_aineisto, index) => <ActionsColumn index={index} remove={remove} />,
        meta: { minWidth: 120, widthFractions: 2 },
      },
    ],
    [register, aineistoRoute, control, allOptions, props.kategoriaId, getValues, setValue, remove]
  );

  const findRowIndex = useCallback((id: string) => fields.findIndex((row) => row.uuid.toString() === id), [fields]);

  const onDragAndDrop = useCallback(
    (id: string, targetRowIndex: number) => {
      move(findRowIndex(id), targetRowIndex);
    },
    [findRowIndex, move]
  );

  const table = useReactTable({
    columns,
    data: fields || [],
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
