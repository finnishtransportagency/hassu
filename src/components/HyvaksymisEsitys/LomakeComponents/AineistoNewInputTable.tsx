import IconButton from "@components/button/IconButton";
import HassuTable from "@components/table/HassuTable";
import { MUIStyledCommonProps, styled } from "@mui/system";
import sx from "@mui/system/sx";
import { AineistoInputNew, AineistoNew } from "@services/api";
import { ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { formatDateTime } from "common/util/dateUtils";
import { ComponentProps, useCallback, useMemo } from "react";
import {
  ArrayPath,
  FieldArrayWithId,
  FieldPath,
  FieldPathValue,
  FieldValues,
  UseFieldArrayRemove,
  useFieldArray,
  useFormContext,
} from "react-hook-form";
import useTableDragConnectSourceContext from "src/hooks/useDragConnectSourceContext";
import { useIsTouchScreen } from "src/hooks/useIsTouchScreen";

export type FieldPathByValue<TFieldValues extends FieldValues, TValue> = {
  [Key in FieldPath<TFieldValues>]: FieldPathValue<TFieldValues, Key> extends TValue ? Key : never;
}[FieldPath<TFieldValues>];

type FormWithAineistoInputNewArray = { [Key: string]: AineistoInputNew[] };

export default function AineistoNewInputTable({
  aineistoRoute,
  aineisto,
}: {
  aineistoRoute: FieldPathByValue<FormWithAineistoInputNewArray, AineistoInputNew[]> & ArrayPath<FormWithAineistoInputNewArray>;
  aineisto?: AineistoNew[];
}) {
  const { control } = useFormContext<FormWithAineistoInputNewArray>();
  const { fields, remove, move } = useFieldArray({ name: aineistoRoute, control });

  const enrichedFields: (FieldArrayWithId<FormWithAineistoInputNewArray, string, "id"> & Pick<AineistoNew, "lisatty" | "tiedosto">)[] =
    useMemo(
      () =>
        fields.map((field) => {
          const aineistoData = aineisto || [];
          const { lisatty, tiedosto } = aineistoData.find(({ uuid }) => uuid === field.uuid) || {};

          return { ...field, lisatty, tiedosto };
        }),
      [fields, aineisto]
    );

  const columns = useMemo<ColumnDef<AineistoInputNew & Pick<AineistoNew, "lisatty" | "tiedosto">>[]>(
    () => [
      {
        header: "Aineisto",
        meta: { minWidth: 250, widthFractions: 4 },
        id: "aineisto",
        accessorFn: (aineisto) => {
          return <>{aineisto.uuid}</>;
        },
      },
      {
        header: "Tuotu",
        id: "tuotu",
        accessorFn: (aineisto) => (aineisto.lisatty ? formatDateTime(aineisto.lisatty) : undefined),
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
    [fields, remove]
  );

  const findRowIndex = useCallback(
    (id: string) => {
      return enrichedFields.findIndex((row) => row.id === id);
    },
    [enrichedFields]
  );

  const onDragAndDrop = useCallback(
    (id: string, targetRowIndex: number) => {
      const index = findRowIndex(id);
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
