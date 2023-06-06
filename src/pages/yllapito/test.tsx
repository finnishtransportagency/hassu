import React, { useCallback, useMemo } from "react";
import { CellContext, ColumnDef, Row, TableOptions, createColumnHelper, getCoreRowModel } from "@tanstack/react-table";
import HassuTable from "@components/HassuTable2";
import { useDrag, useDrop } from "react-dnd";
import useDragConnectSourceContext from "src/hooks/useDragConnectSourceContext";
import IconButton from "@components/button/IconButton";

export type Item = {
  id: number;
  text: string;
};

const ITEMS: Item[] = [
  {
    id: 1,
    text: "Write a cool JS library",
  },
  {
    id: 2,
    text: "Make it generic enough",
  },
  {
    id: 3,
    text: "Write README",
  },
  {
    id: 4,
    text: "Create some examples",
  },
  {
    id: 5,
    text: "Spam in Twitter and IRC to promote it",
  },
  {
    id: 6,
    text: "???",
  },
  {
    id: 7,
    text: "PROFIT",
  },
];

const columnHelper = createColumnHelper<Item>();

const defaultColumns: ColumnDef<Item>[] = [
  columnHelper.accessor("text" as any, { id: "text", header: "text" }),
  columnHelper.display({ id: "actions", header: "actions", cell: SomeSome }),
];

function SomeSome() {
  const dragRef = useDragConnectSourceContext();
  return <IconButton icon="equals" ref={dragRef} />;
}

export default function App() {
  const [columns] = React.useState(() => [...defaultColumns]);
  const [data, setData] = React.useState<Item[]>(ITEMS);

  const findRowIndex = useCallback(
    (id: string) => {
      return data.findIndex((row) => row.id.toString() === id);
    },
    [data]
  );

  const onDragAndDrop = useCallback(
    (id: string, targetRowIndex: number) => {
      const index = findRowIndex(id);
      data.splice(targetRowIndex, 0, data.splice(index, 1)[0]);
      setData([...data]);
    },
    [data, findRowIndex]
  );

  const tableOptions = useMemo<TableOptions<Item>>(
    () => ({
      data,
      columns,
      getCoreRowModel: getCoreRowModel(),
      getRowId: (row) => `${row.id}`, //good to have guaranteed unique row ids/keys for rendering
      meta: { onDragAndDrop, findRowIndex },
    }),
    [columns, data, findRowIndex, onDragAndDrop]
  );

  return <HassuTable tableOptions={tableOptions} />;
}
