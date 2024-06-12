import ExtLink from "@components/ExtLink";
import IconButton from "@components/button/IconButton";
import HassuTable from "@components/table/HassuTable";
import { styled } from "@mui/system";
import sx from "@mui/system/sx";
import { LadattavaTiedosto } from "@services/api";
import { ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useMemo } from "react";
import { useIsTouchScreen } from "src/hooks/useIsTouchScreen";

export default function LadattavaTiedostoTable({
  id,
  tiedostot,
  noHeaders,
}: {
  id: string;
  tiedostot?: LadattavaTiedosto[] | null;
  noHeaders?: boolean;
}) {
  const columns = useMemo<ColumnDef<LadattavaTiedosto>[]>(
    () => [
      {
        header: noHeaders ? undefined : "Tiedosto",
        meta: { minWidth: 250, widthFractions: 4 },
        id: "tiedosto",
        accessorFn: (tiedosto) => {
          return (
            <>
              <ExtLink
                className="file_download"
                href={tiedosto.linkki ? tiedosto.linkki : undefined}
                target="_blank"
                disabled={!tiedosto.linkki}
                hideIcon={!tiedosto.linkki}
              >
                {tiedosto.nimi}
              </ExtLink>
            </>
          );
        },
      },
      {
        header: noHeaders ? undefined : "",
        id: "tuotu",
        accessorFn: (_tiedosto) => undefined,
        meta: { minWidth: 120, widthFractions: 2 },
      },
      {
        header: noHeaders ? undefined : "",
        id: "actions",
        accessorFn: (_tiedosto) => {
          return <ActionsColumn />;
        },
        meta: { minWidth: 120, widthFractions: 0 },
      },
    ],
    [noHeaders]
  );

  const table = useReactTable({
    columns,
    data: tiedostot || [],
    getCoreRowModel: getCoreRowModel(),
    state: {
      pagination: undefined,
    },
    defaultColumn: { cell: (cell) => cell.getValue() || "-" },
    meta: { tableId: id, virtualization: { type: "window" } },
  });

  return <HassuTable table={table} />;
}

export const ActionsColumn = styled(() => {
  const isTouch = useIsTouchScreen();
  return (
    <div>
      <IconButton style={{ visibility: "hidden" }} type="button" disabled icon="trash" />
      {!isTouch && <IconButton style={{ visibility: "hidden" }} disabled type="button" icon="equals" />}
    </div>
  );
})(sx({ display: "flex", justifyContent: "center", gap: 2 }));
