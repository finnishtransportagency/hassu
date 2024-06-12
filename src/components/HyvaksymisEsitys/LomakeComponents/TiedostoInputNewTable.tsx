import ExtLink from "@components/ExtLink";
import IconButton from "@components/button/IconButton";
import HassuTable from "@components/table/HassuTable";
import { MUIStyledCommonProps, styled } from "@mui/system";
import sx from "@mui/system/sx";
import { ColumnDef, Row, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { formatDateTime } from "common/util/dateUtils";
import { ComponentProps, useCallback, useMemo } from "react";
import { FieldArrayWithId, UseFieldArrayMove, UseFieldArrayRemove, UseFormRegisterReturn } from "react-hook-form";
import useTableDragConnectSourceContext from "src/hooks/useDragConnectSourceContext";
import { useIsTouchScreen } from "src/hooks/useIsTouchScreen";

type GenTiedosto = {
  uuid: string;
  tiedosto?: string | null;
  lisatty?: string | null;
  tuotu?: boolean | null;
};

type GenTiedostoInput = {
  uuid: string;
  nimi: string;
};

type FormWithTiedostoInputNewArray<T extends GenTiedostoInput> = { [Key: string]: T[] };

type FieldType = FieldArrayWithId<FormWithTiedostoInputNewArray<GenTiedostoInput>, string, "id">;
type RowDataType<S extends GenTiedosto> = FieldType & Pick<S, "lisatty" | "tiedosto" | "tuotu">;

export default function TiedostoInputNewTable<S extends GenTiedosto>({
  tiedostot,
  fields,
  remove,
  move,
  registerDokumenttiOid,
  registerNimi,
  ladattuTiedosto,
}: {
  tiedostot?: S[] | null;
  fields: FieldType[];
  remove: UseFieldArrayRemove;
  move: UseFieldArrayMove;
  registerNimi: (index: number) => UseFormRegisterReturn;
  registerDokumenttiOid?: (index: number) => UseFormRegisterReturn;
  ladattuTiedosto?: boolean;
}) {
  const enrichedFields: RowDataType<S>[] = useMemo(
    () =>
      fields.map((field) => {
        const tiedostoData = tiedostot || [];
        const { lisatty, tiedosto, tuotu } = tiedostoData.find(({ uuid }) => uuid === field.uuid) || {};

        return { ...field, lisatty, tiedosto, tuotu: tuotu ?? false };
      }),
    [fields, tiedostot]
  );

  const columns = useMemo<ColumnDef<RowDataType<S>>[]>(
    () => [
      {
        header: ladattuTiedosto ? "Tiedostot" : "Aineisto",
        meta: { minWidth: 250, widthFractions: 4 },
        id: "tiedosto",
        accessorFn: (tiedosto) => {
          const index = enrichedFields.findIndex((row) => row.uuid === tiedosto.uuid);
          return (
            <>
              <ExtLink
                className="file_download"
                href={tiedosto.tiedosto ? "/" + tiedosto.tiedosto : undefined}
                target="_blank"
                disabled={!tiedosto.tiedosto}
                hideIcon={!tiedosto.tiedosto}
              >
                {tiedosto.nimi}
              </ExtLink>
              {registerDokumenttiOid && <input type="hidden" {...registerDokumenttiOid(index)} />}
              <input type="hidden" {...registerNimi(index)} />
            </>
          );
        },
      },
      {
        header: "Tuotu",
        id: "tuotu",
        accessorFn: (tiedosto) => (tiedosto.lisatty && (tiedosto.tuotu || ladattuTiedosto) ? formatDateTime(tiedosto.lisatty) : undefined),
        meta: { minWidth: 120, widthFractions: 2 },
      },
      {
        header: "",
        id: "actions",
        accessorFn: (tiedosto) => {
          const index = fields.findIndex((row) => row.id === tiedosto.uuid);
          return <ActionsColumn index={index} remove={remove} />;
        },
        meta: { minWidth: 120, widthFractions: 2 },
      },
    ],
    [enrichedFields, fields, registerDokumenttiOid, registerNimi, remove, ladattuTiedosto]
  );

  const findRowIndex = useCallback((id: string, rows?: Row<RowDataType<S>>[]) => {
    return rows?.findIndex((row) => row.id === id) ?? -1;
  }, []);

  const onDragAndDrop = useCallback(
    (id: string, targetRowIndex: number, rows?: Row<RowDataType<S>>[]) => {
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
