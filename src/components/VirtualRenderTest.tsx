import React from "react";
import { faker } from "@faker-js/faker";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { ColumnDef, Row, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";

const randomNumber = (min: number, max: number) => faker.datatype.number({ min, max });

type Post = {
  id: number;
  sentence: string;
};

const sentences: Post[] = new Array(10000)
  .fill(true)
  .map((_, index) => ({ id: index + 1, sentence: faker.lorem.sentence(randomNumber(20, 70)) }));

const columns: ColumnDef<Post>[] = [{ accessorKey: "sentence" }];

const RowVirtualizerDynamicWindow = () => {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const parentOffsetRef = React.useRef(0);

  React.useLayoutEffect(() => {
    parentOffsetRef.current = parentRef.current?.offsetTop ?? 0;
  }, []);

  const table = useReactTable({
    getCoreRowModel: getCoreRowModel(),
    data: sentences,
    columns,
    getRowId: (row) => `${row.id}`,
  });

  const virtualizer = useWindowVirtualizer({
    count: sentences.length,
    estimateSize: () => 150,
    scrollMargin: parentOffsetRef.current,
  });
  const items = virtualizer.getVirtualItems();

  const rows = table.getRowModel().rows;

  return (
    <div ref={parentRef}>
      <div
        style={{
          height: virtualizer.getTotalSize(),
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
            transform: `translateY(${items[0].start - virtualizer.options.scrollMargin}px)`,
          }}
        >
          {items.map((virtualRow) => {
            const row = rows[virtualRow.index] as Row<Post>;
            return (
              <div data-index={virtualRow.index} ref={virtualizer.measureElement} style={{ margin: "4px" }} key={virtualRow.key}>
                {row.getVisibleCells().map((cell) => {
                  return <div key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</div>;
                })}
              </div>
            );
          })}
          {/* {items.map((virtualRow) => (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className={virtualRow.index % 2 ? "ListItemOdd" : "ListItemEven"}
            >
              <div style={{ padding: "10px 0" }}>
                <div>Row {virtualRow.index}</div>
                <div>{sentences[virtualRow.index].sentence}</div>
              </div>
            </div>
          ))} */}
        </div>
      </div>
    </div>
  );
};

const RowVirtualizerDynamicWindow2 = () => {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const parentOffsetRef = React.useRef(0);

  React.useLayoutEffect(() => {
    parentOffsetRef.current = parentRef.current?.offsetTop ?? 0;
  }, []);

  const virtualizer = useWindowVirtualizer({
    count: sentences.length,
    estimateSize: () => 45,
    scrollMargin: parentOffsetRef.current,
  });
  const items = virtualizer.getVirtualItems();

  return (
    <div ref={parentRef} className="List">
      <div
        style={{
          height: virtualizer.getTotalSize(),
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
            transform: `translateY(${items[0].start - virtualizer.options.scrollMargin}px)`,
          }}
        >
          {items.map((virtualRow) => (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className={virtualRow.index % 2 ? "ListItemOdd" : "ListItemEven"}
            >
              <div style={{ padding: "10px 0" }}>
                <div>Row {virtualRow.index}</div>
                <div>{sentences[virtualRow.index].sentence}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RowVirtualizerDynamicWindow;
