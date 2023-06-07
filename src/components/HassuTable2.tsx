import { Pagination, useMediaQuery } from "@mui/material";
import { Row, Table, TableOptions, flexRender, useReactTable } from "@tanstack/react-table";
import React, { ComponentProps, Fragment, createContext, useMemo } from "react";
import { styled, experimental_sx as sx } from "@mui/system";
import ContentSpacer from "./layout/ContentSpacer";
import { breakpoints } from "./layout/HassuMuiThemeProvider";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/dist/client/link";
import { ConnectDragSource, useDrag, useDrop } from "react-dnd";

export type HassuTableProps<T> = {
  table: Table<T>;
};

const DEFAULT_COL_MIN_WIDTH = 170;
const DEFAULT_COL_WIDTH_FRACTIONS = 1;

export default function HassuTable<T>(props: HassuTableProps<T>) {
  const table = props.table;

  const [, dropRef] = useDrop(() => ({ accept: "row" }));

  return (
    <ContentSpacer gap={7}>
      <HassuTablePagination table={table} />
      <TableWrapper>
        <StyledTable id={table.options.meta?.tableId}>
          <colgroup>
            {table.getHeaderGroups().map((headerGroups) =>
              headerGroups.headers.map((header) => {
                const minWidth = `${header.column.columnDef.meta?.minWidth ?? DEFAULT_COL_MIN_WIDTH}px`;
                const widthFractions = header.column.columnDef.meta?.widthFractions ?? DEFAULT_COL_WIDTH_FRACTIONS;
                return (
                  <Fragment key={header.id}>
                    {Array.from(Array(widthFractions).keys()).map((colNum) => (
                      <Col key={colNum} sx={{ minWidth: colNum === 0 ? minWidth : undefined }} />
                    ))}
                  </Fragment>
                );
              })
            )}
          </colgroup>
          <TableHead table={table} />
          <Tbody ref={dropRef}>
            {table.getRowModel().rows.map((row) => (
              <FunctionalRow row={row} table={table} key={row.id} />
            ))}
          </Tbody>
        </StyledTable>
      </TableWrapper>
      <HassuTablePagination table={table} />
    </ContentSpacer>
  );
}

type PaginationProps<T> = {
  table: Table<T>;
};

function HassuTablePagination<T>({ table }: PaginationProps<T>) {
  return (
    <>
      {table.getState().pagination && (
        <Pagination
          count={table.getPageCount()}
          page={table.getState().pagination.pageIndex + 1}
          onChange={(_, pageIndex) => table.setPageIndex(pageIndex - 1)}
          showFirstButton
          showLastButton
          color="primary"
          sx={{
            ".MuiPagination-ul": { justifyContent: "flex-end" },
          }}
        />
      )}
    </>
  );
}

type TableHeadProps<T> = {
  table: Table<T>;
};

function TableHead<T>({ table }: TableHeadProps<T>) {
  return (
    <Thead>
      {table.getHeaderGroups().map((headerGroup) => (
        <Tr key={headerGroup.id}>
          {headerGroup.headers.map((header) => {
            const isSorted = header.column.getIsSorted();
            return (
              <HeaderCell
                key={header.id}
                colSpan={header.column.columnDef.meta?.widthFractions ?? DEFAULT_COL_WIDTH_FRACTIONS}
                onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
              >
                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                {isSorted && <FontAwesomeIcon className="ml-4" icon={isSorted === "desc" ? "arrow-down" : "arrow-up"} />}
              </HeaderCell>
            );
          })}
        </Tr>
      ))}
    </Thead>
  );
}

type RowProps<T> = {
  row: Row<T>;
  table: Table<T>;
};

function FunctionalRow<T>(props: RowProps<T>) {
  const meta = props.table.options.meta;
  const href = meta?.rowHref?.(props.row);
  const onClick: React.MouseEventHandler<HTMLDivElement> | undefined = useMemo(() => {
    return meta?.rowOnClick ? (event) => meta.rowOnClick?.(event, props.row) : undefined;
  }, [meta, props.row]);

  return href ? (
    <Link href={href} passHref>
      <BasicRowWithoutStyles as="a" onClick={onClick} table={props.table} row={props.row} />
    </Link>
  ) : (
    <BasicRowWithoutStyles onClick={onClick} table={props.table} row={props.row} />
  );
}

export const DragConnectSourceContext = createContext<ConnectDragSource | null>(null);

function BasicRowWithoutStyles<T>({ row, table, ...props }: RowProps<T> & ComponentProps<typeof BodyTr>) {
  const isMedium = useMediaQuery(`(min-width: ${breakpoints.values?.md}px)`);
  const findRow = table.options.meta?.findRowIndex;
  const onDragAndDrop = table.options.meta?.onDragAndDrop;
  const originalIndex = findRow?.(row.id);

  const [, dropRef] = useDrop(
    {
      accept: "row",
      hover({ id: draggedId }: Row<T>) {
        if (draggedId !== row.id) {
          const overIndex = findRow?.(row.id);
          typeof overIndex === "number" && onDragAndDrop?.(draggedId, overIndex);
        }
      },
    },
    [row.id, originalIndex, onDragAndDrop, findRow]
  );

  const [{ isDragging }, dragRef, previewRef] = useDrag(
    {
      type: "row",
      item: { id: row.id, originalIndex },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
      end: (item, monitor) => {
        const { id: droppedId, originalIndex } = item;
        const didDrop = monitor.didDrop();
        if (!didDrop && typeof originalIndex === "number") {
          onDragAndDrop?.(droppedId, originalIndex);
        }
      },
    },
    [row.id, originalIndex, onDragAndDrop]
  );

  return (
    <DragConnectSourceContext.Provider value={dragRef}>
      <BodyTr ref={(node) => previewRef(dropRef(node))} sx={{ opacity: isDragging ? 0 : 1 }} {...props}>
        {row.getVisibleCells().map((cell) => (
          <DataCell key={cell.id} colSpan={cell.column.columnDef.meta?.widthFractions ?? DEFAULT_COL_WIDTH_FRACTIONS}>
            {!isMedium && <BodyHeaderCell>{flexRender(cell.column.columnDef.header, cell.getContext())}</BodyHeaderCell>}
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </DataCell>
        ))}
      </BodyTr>
    </DragConnectSourceContext.Provider>
  );
}

const Thead = styled("thead")(sx({}));
const Tbody = styled("tbody")(sx({}));
const Col = styled("col")(sx({}));

const StyledTable = styled("table")(
  sx({
    width: "100%",
    overflowWrap: "anywhere",
    hyphens: "auto",
    tableLayout: "fixed",
  })
);

const TableWrapper = styled("div")(
  sx({
    overflowX: "auto",
  })
);

const Tr = styled("tr")(
  sx({
    display: "table-row",
  })
);

const BodyTr = styled(Tr)(
  sx({
    ":nth-of-type(odd)": {
      backgroundColor: "#f8f8f8",
    },
    borderBottomWidth: "2px",
    borderBottomColor: "#49c2f1",
    borderBottomStyle: "solid",
  })
);

const Cell = styled("td")(
  sx({
    ":first-of-type": { paddingLeft: 4 },
    ":last-of-type": { paddingRight: 4 },
    paddingLeft: 2,
    paddingRight: 2,
    paddingTop: { xs: 4, md: 7.5 },
    paddingBottom: { xs: 4, md: 7.5 },
  })
);

const HeaderCell = styled("th")(({ onClick }) =>
  sx({
    ":first-of-type": { paddingLeft: 4 },
    ":last-of-type": { paddingRight: 4 },
    paddingLeft: 2,
    paddingRight: 2,
    paddingBottom: { md: 2 },
    color: "#7A7A7A",
    textAlign: "left",
    cursor: onClick ? "pointer" : undefined,
  })
);

const BodyHeaderCell = styled("div")(sx({}));

const DataCell = styled(Cell)(sx({}));
