import React, { useCallback } from "react";
import { ColumnDef, createColumnHelper, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import HassuTable from "@components/HassuTable2";
import useDragConnectSourceContext from "src/hooks/useDragConnectSourceContext";
import IconButton from "@components/button/IconButton";
import { faker } from "@faker-js/faker";

export type Item = {
  id: number;
  text: string;
};

const sentences: Item[] = new Array(10000).fill(true).map((_, index) => ({ id: index + 1, text: faker.name.lastName() }));

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
  const [data, setData] = React.useState<Item[]>(sentences);

  console.log(data[0]);

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

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => `${row.id}`, //good to have guaranteed unique row ids/keys for rendering
    meta: { onDragAndDrop, findRowIndex, virtualization: { type: "window" } },
  });

  return <HassuTable table={table} />;
}
