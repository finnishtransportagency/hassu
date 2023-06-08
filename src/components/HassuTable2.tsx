import { Checkbox, MenuItem, Pagination, Select, useMediaQuery } from "@mui/material";
import { ColumnDef, ColumnSort, HeaderContext, Row, SortType, Table, flexRender } from "@tanstack/react-table";
import React, { ComponentProps, createContext, forwardRef, useMemo } from "react";
import { styled, experimental_sx as sx } from "@mui/system";
import ContentSpacer from "./layout/ContentSpacer";
import { breakpoints } from "./layout/HassuMuiThemeProvider";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/dist/client/link";
import { ConnectDragSource, useDrag, useDrop } from "react-dnd";
import { isEqual } from "lodash";
import ConditionalWrapper from "./layout/ConditionalWrapper";

export type HassuTableProps<T> = {
  table: Table<T>;
};

const DEFAULT_COL_MIN_WIDTH = 180;
const DEFAULT_COL_WIDTH_FRACTIONS = 1;

const Span = styled("span")(sx({}));

export const selectColumnDef: <T>() => ColumnDef<T> = () => ({
  id: "select",
  header: SelectHeader,
  cell: ({ row }) => (
    <Span sx={{ display: "flex", justifyContent: "center" }}>
      <Checkbox
        checked={row.getIsSelected()}
        disabled={!row.getCanSelect()}
        indeterminate={row.getIsSomeSelected()}
        onChange={row.getToggleSelectedHandler()}
      />
    </Span>
  ),
  meta: { minWidth: 100, widthFractions: 1 },
});

function SelectHeader<T>(props: HeaderContext<T, unknown>) {
  return (
    <>
      <Span
        sx={{ display: "flex", justifyContent: "center", flexDirection: "column", alignItems: "center", width: "100%", margin: "auto" }}
      >
        <Span>Valitse</Span>
        <Span sx={{ position: "relative" }}>
          <Checkbox
            disabled={!props.table.options.enableRowSelection}
            checked={props.table.getIsAllRowsSelected()}
            indeterminate={props.table.getIsSomeRowsSelected()}
            onChange={props.table.getToggleAllRowsSelectedHandler()}
            sx={{
              "&::before": {
                content: '"("',
                position: "absolute",
                top: "50%",
                left: "5%",
                transform: "translateY(-50%)",
                color: "#7A7A7A",
              },
              "&::after": {
                content: '")"',
                position: "absolute",
                top: "50%",
                right: "5%",
                transform: "translateY(-50%)",
                color: "#7A7A7A",
              },
            }}
          />
        </Span>
      </Span>
    </>
  );
}

type SortHeaderInfo = {
  id: string;
  renderHeader: React.ReactNode | JSX.Element;
  sortType: SortType | undefined;
  sortDescFirst: boolean | undefined;
  canSort: boolean;
};
type VisibleHeaderInfo = {
  id: string;
  renderHeader: string;
  sortType: SortType | undefined;
  sortDescFirst: boolean | undefined;
  canSort: boolean;
};

export default function HassuTable<T>(props: HassuTableProps<T>) {
  const table = props.table;
  const isMedium = useMediaQuery(`(min-width: ${breakpoints.values?.md}px)`);

  const gridTemplateColumns = useMemo(() => {
    return table.options.columns
      .map<string>((column) => {
        const minWidth = column.meta?.minWidth ?? DEFAULT_COL_MIN_WIDTH;
        const fractions = column.meta?.widthFractions ?? DEFAULT_COL_WIDTH_FRACTIONS;
        return `minmax(${minWidth}px, ${fractions}fr)`;
      })
      .join(" ");
  }, [table.options.columns]);

  const [, dropRef] = useDrop(() => ({ accept: "row" }));

  return (
    <ContentSpacer gap={7}>
      {!isMedium && table.options.enableSorting && <TableMobileSorting table={table} />}
      <HassuTablePagination table={table} />
      {isMedium ? (
        <TableWrapper>
          <StyledTable id={table.options.meta?.tableId}>
            <TableHead gridTemplateColumns={gridTemplateColumns} table={table} />
            <Tbody ref={dropRef}>
              {table.getRowModel().rows.map((row) => (
                <FunctionalRow gridTemplateColumns={gridTemplateColumns} row={row} table={table} key={row.id} />
              ))}
            </Tbody>
          </StyledTable>
        </TableWrapper>
      ) : (
        <MobileTable ref={dropRef} id={table.options.meta?.tableId}>
          {table.getRowModel().rows.map((row) => (
            <FunctionalRow gridTemplateColumns={gridTemplateColumns} row={row} table={table} key={row.id} />
          ))}
        </MobileTable>
      )}
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
  gridTemplateColumns: string;
};

function TableHead<T>({ table, gridTemplateColumns }: TableHeadProps<T>) {
  return (
    <Thead>
      {table.getHeaderGroups().map((headerGroup) => (
        <Tr key={headerGroup.id} sx={{ gridTemplateColumns }}>
          {headerGroup.headers.map((header) => {
            const isSorted = header.column.getIsSorted();
            const canSort = header.column.getCanSort();
            return (
              <HeaderCell key={header.id}>
                <BodyHeaderCell as={canSort ? "button" : undefined} onClick={canSort ? header.column.getToggleSortingHandler() : undefined}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  {isSorted && <FontAwesomeIcon className="ml-4" icon={isSorted === "desc" ? "arrow-down" : "arrow-up"} />}
                </BodyHeaderCell>
              </HeaderCell>
            );
          })}
        </Tr>
      ))}
    </Thead>
  );
}

function TableMobileSorting<T>({ table }: HassuTableProps<T>) {
  const sortOptions = table
    .getHeaderGroups()
    .flatMap((group) => group.headers)
    .map<SortHeaderInfo>((header) => ({
      id: header.id,
      renderHeader: flexRender(header.column.columnDef.header, header.getContext()),
      sortType: header.column.columnDef.meta?.sortType,
      sortDescFirst: header.column.columnDef.sortDescFirst,
      canSort: header.column.getCanSort(),
    }))
    .filter((header): header is VisibleHeaderInfo => typeof header.renderHeader === "string" && header.canSort)
    .reduce<{ label: string; value: ColumnSort; stringValue: string }[]>((acc, header) => {
      const columnIsDateTime = header.sortType === "datetime";

      const columnAsc = {
        label: header.renderHeader + ` ${columnIsDateTime ? " (vanhin ensin)" : "(A-Ö)"}`,
        value: { id: header.id, desc: false },
        stringValue: JSON.stringify({ id: header.id, desc: false }),
      };
      const columnDesc = {
        label: header.renderHeader + ` ${columnIsDateTime ? " (uusin ensin)" : "(Ö-A)"}`,
        value: { id: header.id, desc: true },
        stringValue: JSON.stringify({ id: header.id, desc: true }),
      };
      if (header.sortDescFirst) {
        acc.push(columnDesc);
        acc.push(columnAsc);
      } else {
        acc.push(columnAsc);
        acc.push(columnDesc);
      }
      return acc;
    }, []);

  const selectedOption = sortOptions.find((option) => isEqual(option.value, table.getState().sorting[0]));

  return (
    <Select
      value={selectedOption?.stringValue || null}
      onChange={(event) => {
        const newSortOption = sortOptions.find((option) => option.stringValue === event.target.value);
        const newSortBy = newSortOption ? [newSortOption.value] : [];
        table.setSorting(newSortBy);
      }}
      fullWidth
    >
      {sortOptions.map((option) => (
        <MenuItem key={option.stringValue} value={option.stringValue}>
          {option.label}
        </MenuItem>
      ))}
    </Select>
  );
}

type RowProps<T> = {
  row: Row<T>;
  table: Table<T>;
  gridTemplateColumns: string;
};

function FunctionalRow<T>(props: RowProps<T>) {
  const meta = props.table.options.meta;
  const href = meta?.rowHref?.(props.row);
  const onClick: React.MouseEventHandler<HTMLDivElement> | undefined = useMemo(() => {
    return meta?.rowOnClick ? (event) => meta.rowOnClick?.(event, props.row) : undefined;
  }, [meta, props.row]);

  return (
    <ConditionalWrapper
      condition={!!href}
      wrapper={(children) => (
        <Link href={href as string} passHref>
          {children}
        </Link>
      )}
    >
      <BasicRow
        as={href ? "a" : undefined}
        onClick={onClick}
        table={props.table}
        row={props.row}
        gridTemplateColumns={props.gridTemplateColumns}
      />
    </ConditionalWrapper>
  );
}

export const DragConnectSourceContext = createContext<ConnectDragSource | null>(null);

const BasicRow = forwardRef(BasicRowWithoutStyles);

function BasicRowWithoutStyles<T>(
  { row, table, gridTemplateColumns, ...props }: RowProps<T> & ComponentProps<typeof BodyTr>,
  linkRef: React.ForwardedRef<HTMLElement>
) {
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
      {isMedium ? (
        <BodyTr
          ref={(node) => {
            previewRef(dropRef(node));
            typeof linkRef === "function" && linkRef(node);
          }}
          sx={{ opacity: isDragging ? 0 : 1, gridTemplateColumns }}
          {...props}
        >
          {row.getVisibleCells().map((cell) => (
            <DataCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</DataCell>
          ))}
        </BodyTr>
      ) : (
        <MobileRow ref={(node) => previewRef(dropRef(node))} sx={{ opacity: isDragging ? 0 : 1 }} {...props}>
          {row.getVisibleCells().map((cell) => (
            <MobileCell key={cell.id}>
              {<BodyHeaderCell>{flexRender(cell.column.columnDef.header, cell.getContext())}</BodyHeaderCell>}
              <div>{flexRender(cell.column.columnDef.cell, cell.getContext())}</div>
            </MobileCell>
          ))}
        </MobileRow>
      )}
    </DragConnectSourceContext.Provider>
  );
}

const MobileTable = styled("div")(sx({ display: "flex", flexDirection: "column" }));
const MobileRow = styled("div")(
  sx({
    display: "flex",
    flexDirection: "column",
    padding: 4,
    rowGap: 2,
    ":nth-of-type(odd)": {
      backgroundColor: "#f8f8f8",
    },
    borderBottomWidth: "2px",
    borderBottomColor: "#49c2f1",
    borderBottomStyle: "solid",
  })
);
const MobileCell = styled("div")(sx({}));
const BodyHeaderCell = styled("div")(sx({ fontWeight: 700 }));
const BodyHeaderCellContent = styled("div")(sx({}));

const Thead = styled("div")(sx({}));
const Tbody = styled("div")(sx({}));

const StyledTable = styled("div")(
  sx({
    width: "fit-content",
    overflowWrap: "anywhere",
    hyphens: "auto",
  })
);

const TableWrapper = styled("div")(
  sx({
    overflowX: "auto",
  })
);

const Tr = styled("div")(
  sx({
    display: "grid",
    paddingLeft: 4,
    paddingRight: 4,
    gap: 2,
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

const Cell = styled("div")(sx({}));

const HeaderCell = styled(Cell)(({ onClick }) =>
  sx({
    paddingBottom: { md: 2 },
    color: "#7A7A7A",
    textAlign: "left",
    cursor: onClick ? "pointer" : undefined,
  })
);

const DataCell = styled(Cell)(
  sx({
    paddingTop: { xs: 4, md: 7.5 },
    paddingBottom: { xs: 4, md: 7.5 },
  })
);
