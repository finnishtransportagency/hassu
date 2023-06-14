import React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { ColumnDef, flexRender, getCoreRowModel, getSortedRowModel, Row, SortingState, useReactTable } from "@tanstack/react-table";

import { faker } from "@faker-js/faker";
import { styled, experimental_sx as sx } from "@mui/system";

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

export default function App() {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const columns = React.useMemo<ColumnDef<Person>[]>(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        size: 60,
      },
      {
        accessorKey: "firstName",
        cell: (info) => info.getValue(),
      },
      {
        accessorFn: (row) => row.lastName,
        id: "lastName",
        cell: (info) => info.getValue(),
        header: () => <span>Last Name</span>,
      },
      {
        accessorKey: "age",
        header: () => "Age",
        size: 50,
      },
      {
        accessorKey: "visits",
        header: () => <span>Visits</span>,
        size: 50,
      },
      {
        accessorKey: "status",
        header: "Status",
      },
      {
        accessorKey: "progress",
        header: "Profile Progress",
        size: 80,
      },
      {
        accessorKey: "createdAt",
        header: "Created At",
        cell: (info) => info.getValue<Date>().toLocaleString(),
      },
    ],
    []
  );

  const [data] = React.useState(() => makeData(50_000));

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    debugTable: true,
  });

  const tableContainerRef = React.useRef<HTMLDivElement>(null);

  const { rows } = table.getRowModel();
  const rowVirtualizer = useVirtualizer({
    getScrollElement: () => tableContainerRef.current,
    count: rows.length,
    estimateSize: () => 33.5,
    overscan: 10,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  return (
    <StyledDiv>
      <div className="tablehead">
        {table.getHeaderGroups().map((headerGroup) => (
          <div className="row" key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              return (
                <div key={header.id}>
                  {header.isPlaceholder ? null : (
                    <div
                      {...{
                        className: header.column.getCanSort() ? "cursor-pointer select-none" : "",
                        onClick: header.column.getToggleSortingHandler(),
                      }}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{
                        asc: " 🔼",
                        desc: " 🔽",
                      }[header.column.getIsSorted() as string] ?? null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div
        ref={tableContainerRef}
        style={{
          height: "500px",
          overflow: "auto",
        }}
      >
        <div
          style={{
            height: `${totalSize}px`,
            width: "100%",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${virtualRows[0].start - rowVirtualizer.options.scrollMargin}px)`,
            }}
          >
            {virtualRows.map((virtualRow) => {
              const row = rows[virtualRow.index] as Row<Person>;
              return (
                <div key={virtualRow.index} data-index={virtualRow.index} ref={rowVirtualizer.measureElement} className="row">
                  {row.getVisibleCells().map((cell) => {
                    return <div key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</div>;
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </StyledDiv>
  );
}

const StyledDiv = styled("div")(
  sx({
    "& .row": {
      display: "grid",
      gridTemplateColumns: "repeat(8, 1fr)",
    },
  })
);
