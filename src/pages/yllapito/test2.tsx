import React, { useCallback } from "react";
import { ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table";

import { faker } from "@faker-js/faker";
import HassuTable from "@components/HassuTable2";
import IconButton from "@components/button/IconButton";
import useDragConnectSourceContext from "src/hooks/useDragConnectSourceContext";
import RowVirtualizerDynamicWindow from "@components/VirtualRenderTest";

export type Person = {
  id: number;
  firstName: string;
  lastName: string;
  age: number;
  visits: number;
  progress: number;
  status: "relationship" | "complicated" | "single";
  createdAt: Date;
};

const range = (len: number) => {
  const arr = [];
  for (let i = 0; i < len; i++) {
    arr.push(i);
  }
  return arr;
};

const newPerson = (index: number): Person => {
  return {
    id: index + 1,
    firstName: faker.name.firstName(),
    lastName: faker.name.lastName(),
    age: faker.datatype.number(40),
    visits: faker.datatype.number(1000),
    progress: faker.datatype.number(100),
    createdAt: faker.datatype.datetime({ max: new Date().getTime() }),
    status: faker.helpers.shuffle<Person["status"]>(["relationship", "complicated", "single"])[0]!,
  };
};

export function makeData(...lens: number[]) {
  const makeDataLevel = (depth = 0): Person[] => {
    const len = lens[depth]!;
    return range(len).map((d): Person => {
      return {
        ...newPerson(d),
      };
    });
  };

  return makeDataLevel();
}

function SomeSome() {
  const dragRef = useDragConnectSourceContext();
  return <IconButton icon="equals" ref={dragRef} />;
}

const columns: ColumnDef<Person>[] = [
  {
    accessorKey: "id",
    header: "ID",
    size: 60,
  },
  {
    header: "First Name",
    accessorKey: "firstName",
    cell: (info) => info.getValue(),
  },
  {
    accessorFn: (row) => row.lastName,
    id: "lastName",
    cell: (info) => info.getValue(),
    header: "Last Name",
  },
  {
    accessorKey: "age",
    header: "Age",
    size: 50,
  },
  // { id: "actions", header: "actions", cell: SomeSome },
];

function App() {
  const [data, setData] = React.useState(() => makeData(1000));

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
    getRowId: (d) => `${d.id}`,
    getCoreRowModel: getCoreRowModel(),
    debugTable: true,
    meta: { onDragAndDrop, findRowIndex },
  });

  return <HassuTable table={table}></HassuTable>;
}

import dynamic from "next/dynamic";

const DynamicHeader = dynamic(() => import("../../components/VirtualRenderTest"), {
  ssr: false,
});

export default App;
