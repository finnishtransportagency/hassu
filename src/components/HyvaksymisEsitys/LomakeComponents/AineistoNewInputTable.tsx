import ExtLink from "@components/ExtLink";
import IconButton from "@components/button/IconButton";
import HassuTable from "@components/table/HassuTable";
import { MUIStyledCommonProps, styled } from "@mui/system";
import sx from "@mui/system/sx";
import { AineistoInputNew, AineistoNew } from "@services/api";
import { ColumnDef, Row, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { formatDateTime } from "common/util/dateUtils";
import { ComponentProps, useCallback, useMemo } from "react";
import {
  FieldArrayWithId,
  FieldPath,
  FieldPathValue,
  FieldValues,
  UseFieldArrayMove,
  UseFieldArrayRemove,
  UseFormRegisterReturn,
} from "react-hook-form";
import useTableDragConnectSourceContext from "src/hooks/useDragConnectSourceContext";
import { useIsTouchScreen } from "src/hooks/useIsTouchScreen";

export type FieldPathByValue<TFieldValues extends FieldValues, TValue> = {
  [Key in FieldPath<TFieldValues>]: FieldPathValue<TFieldValues, Key> extends TValue ? Key : never;
}[FieldPath<TFieldValues>];

type FormWithAineistoInputNewArray = { [Key: string]: AineistoInputNew[] };

type RowDataType = FieldArrayWithId<FormWithAineistoInputNewArray, string, "id"> & Pick<AineistoNew, "lisatty" | "tiedosto" | "tuotu">;

export default function AineistoNewInputTable({
  aineisto,
  fields,
  remove,
  move,
  registerDokumenttiOid,
  registerNimi,
}: {
  aineisto?: AineistoNew[] | null;
  fields: FieldArrayWithId<FormWithAineistoInputNewArray, string, "id">[];
  remove: UseFieldArrayRemove;
  move: UseFieldArrayMove;
  registerDokumenttiOid: (index: number) => UseFormRegisterReturn;
  registerNimi: (index: number) => UseFormRegisterReturn;
}) {
  const enrichedFields: RowDataType[] = useMemo(
    () =>
      fields.map((field) => {
        const aineistoData = aineisto || [];
        const { lisatty, tiedosto, tuotu } = aineistoData.find(({ uuid }) => uuid === field.uuid) || {};

        return { ...field, lisatty, tiedosto, tuotu: tuotu ?? false };
      }),
    [fields, aineisto]
  );

  const columns = useMemo<ColumnDef<RowDataType>[]>(
    () => [
      {
        header: "Aineisto",
        meta: { minWidth: 250, widthFractions: 4 },
        id: "aineisto",
        accessorFn: (aineisto) => {
          const index = enrichedFields.findIndex((row) => row.uuid === aineisto.uuid);
          return (
            <>
              <ExtLink
                className="file_download"
                href={aineisto.tiedosto ? "/" + aineisto.tiedosto : undefined}
                target="_blank"
                disabled={!aineisto.tiedosto}
                hideIcon={!aineisto.tiedosto}
              >
                {aineisto.nimi}
              </ExtLink>
              <input type="hidden" {...registerDokumenttiOid(index)} />
              <input type="hidden" {...registerNimi(index)} />
            </>
          );
        },
      },
      {
        header: "Tuotu",
        id: "tuotu",
        accessorFn: (aineisto) => (aineisto.lisatty && aineisto.tuotu ? formatDateTime(aineisto.lisatty) : undefined),
        meta: { minWidth: 120, widthFractions: 2 },
      },
      {
        header: "",
        id: "actions",
        accessorFn: (aineisto) => {
          const index = fields.findIndex((row) => row.id === aineisto.uuid);
          return <ActionsColumn index={index} remove={remove} />;
        },
        meta: { minWidth: 120, widthFractions: 2 },
      },
    ],
    [enrichedFields, fields, registerDokumenttiOid, registerNimi, remove]
  );

  const findRowIndex = useCallback((id: string, rows?: Row<RowDataType>[]) => {
    return rows?.findIndex((row) => row.id === id) ?? -1;
  }, []);

  const onDragAndDrop = useCallback(
    (id: string, targetRowIndex: number, rows?: Row<RowDataType>[]) => {
      const index = findRowIndex(id, rows ?? []);
      move(index, targetRowIndex);
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
    meta: { tableId: `jotain_table`, findRowIndex, onDragAndDrop, virtualization: { type: "window" } },
  });

  return <HassuTable table={table} />;
}

type ActionColumnProps = {
  index: number;
  remove: UseFieldArrayRemove;
} & MUIStyledCommonProps &
  ComponentProps<"div">;

export const ActionsColumn = styled(({ index, remove, ...props }: ActionColumnProps) => {
  const dragRef = useTableDragConnectSourceContext();
  const isTouch = useIsTouchScreen();
  return (
    <div {...props}>
      <IconButton
        type="button"
        onClick={() => {
          remove(index);
        }}
        icon="trash"
      />
      {!isTouch && <IconButton type="button" icon="equals" ref={dragRef} />}
    </div>
  );
})(sx({ display: "flex", justifyContent: "center", gap: 2 }));
