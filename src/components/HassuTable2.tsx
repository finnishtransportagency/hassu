import { Checkbox, MenuItem, Pagination, Select, useMediaQuery } from "@mui/material";
import { ColumnDef, ColumnSort, HeaderContext, Row, SortType, Table, flexRender } from "@tanstack/react-table";
import React, { ComponentProps, ForwardedRef, createContext, forwardRef, useMemo } from "react";
import { styled, experimental_sx as sx } from "@mui/system";
import ContentSpacer from "./layout/ContentSpacer";
import { breakpoints } from "./layout/HassuMuiThemeProvider";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/dist/client/link";
import { ConnectDragSource, useDrag, useDrop } from "react-dnd";
import ConditionalWrapper from "./layout/ConditionalWrapper";
import { Virtualizer, useVirtualizer, useWindowVirtualizer } from "@tanstack/react-virtual";
import isEqual from "lodash/isEqual";

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
  const virtualization = props.table.options.meta?.virtualization;

  if (virtualization?.type === "scrollElement") {
    return <HassuTableVirtualScrollElement table={props.table} getScrollElement={virtualization.getScrollElement} />;
  } else if (virtualization?.type === "window") {
    return <HassuTableVirtualWindow table={props.table} />;
  }
  return <HassuTabl2 table={props.table} />;
}

function HassuTableVirtualScrollElement<T>(props: HassuTableProps<T> & { getScrollElement: () => Element | null }) {
  const parentRef = React.useRef<HTMLDivElement>(null);
  const parentOffsetRef = React.useRef(0);

  React.useLayoutEffect(() => {
    parentOffsetRef.current = (parentRef.current?.getBoundingClientRect?.()?.top ?? 0) + (props.getScrollElement()?.scrollTop ?? 0);
  }, [props]);

  const virtualizer = useVirtualizer({
    count: props.table.options.data.length,
    estimateSize: () => 106,
    getScrollElement: props.getScrollElement,
    scrollMargin: parentOffsetRef.current,
  });
  const virtualRows = virtualizer.getVirtualItems();
  const virtualizerProps: ScrollElementVirtualizerTableProps = useMemo(
    () => ({
      parentRef,
      type: "scrollElement",
      virtualizer,
      bodySx: {
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        transform: `translateY(${(virtualRows?.[0]?.start ?? 0) - (virtualizer?.options?.scrollMargin ?? 0)}px)`,
      },
    }),
    [virtualRows, virtualizer]
  );

  return <HassuTabl2 {...props} virtualizerProps={virtualizerProps} />;
}

function HassuTableVirtualWindow<T>(props: HassuTableProps<T>) {
  const parentRef = React.useRef<HTMLDivElement>(null);
  const parentOffsetRef = React.useRef(0);
  React.useLayoutEffect(() => {
    parentOffsetRef.current = (parentRef.current?.getBoundingClientRect?.()?.top ?? 0) + (window?.scrollY ?? 0);
  }, []);
  const virtualizer = useWindowVirtualizer({
    count: props.table.options.data.length,
    estimateSize: () => 106,
    scrollMargin: parentOffsetRef.current,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const virtualizerProps: WindowVirtualizerTableProps = useMemo(
    () => ({
      parentOffsetRef,
      parentRef,
      type: "window",
      virtualizer,
      bodySx: {
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        transform: `translateY(${(virtualRows?.[0]?.start ?? 0) - (virtualizer?.options?.scrollMargin ?? 0)}px)`,
      },
    }),
    [virtualRows, virtualizer]
  );

  return <HassuTabl2 {...props} virtualizerProps={virtualizerProps} />;
}

type WindowVirtualizerTableProps = {
  type: "window";
  virtualizer: Virtualizer<Window, Element>;
  parentRef: React.RefObject<HTMLDivElement>;
  parentOffsetRef: React.MutableRefObject<number>;
  bodySx: ComponentProps<typeof Tbody>["sx"];
};

type ScrollElementVirtualizerTableProps = {
  type: "scrollElement";
  virtualizer: Virtualizer<Element, Element>;
  parentRef: React.RefObject<HTMLDivElement>;
  bodySx: ComponentProps<typeof Tbody>["sx"];
};

function HassuTabl2<T>(
  props: HassuTableProps<T> & { virtualizerProps?: WindowVirtualizerTableProps | ScrollElementVirtualizerTableProps }
) {
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

  const { rows: actualRows } = table.getRowModel();

  const rowVirtualizer = props.virtualizerProps?.virtualizer;

  const virtualRows = rowVirtualizer?.getVirtualItems();
  const rows = virtualRows?.map((virtualRow) => actualRows[virtualRow.index]) || actualRows;

  const [, dropRef] = useDrop(() => ({ accept: "row" }));

  return (
    <ContentSpacer gap={7}>
      {!isMedium && table.options.enableSorting && <TableMobileSorting table={table} />}
      <HassuTablePagination table={table} />
      <TableWrapper>
        <StyledTable id={table.options.meta?.tableId}>
          {isMedium && <TableHead gridTemplateColumns={gridTemplateColumns} table={table} />}
          <TbodyWrapper
            ref={props.virtualizerProps?.parentRef}
            sx={{
              height: rowVirtualizer?.getTotalSize(),
            }}
          >
            <Tbody sx={props.virtualizerProps?.bodySx} ref={dropRef}>
              {rows.map((row) => (
                <BasicRow
                  gridTemplateColumns={gridTemplateColumns}
                  row={row}
                  table={table}
                  index={row.index}
                  key={row.id}
                  ref={props.virtualizerProps?.virtualizer.measureElement}
                />
              ))}
            </Tbody>
          </TbodyWrapper>
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
  const isMedium = useMediaQuery(`(min-width: ${breakpoints.values?.md}px)`);
  return (
    <>
      {table.getState().pagination && (
        <Pagination
          count={table.getPageCount()}
          page={table.getState().pagination.pageIndex + 1}
          onChange={(_, pageIndex) => table.setPageIndex(pageIndex - 1)}
          showFirstButton
          showLastButton
          size={isMedium ? "medium" : "small"}
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
            const canSort = table.options.enableSorting && header.column.getCanSort();
            return (
              <HeaderCell key={header.id}>
                <HeaderCellContents
                  as={canSort ? "button" : undefined}
                  onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                >
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  {isSorted && <FontAwesomeIcon className="ml-4" icon={isSorted === "desc" ? "arrow-down" : "arrow-up"} />}
                </HeaderCellContents>
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
  index: number;
};

export const DragConnectSourceContext = createContext<ConnectDragSource | null>(null);

const BasicRow = forwardRef(BasicRowWithoutStyles);

function BasicRowWithoutStyles<T>({ row, table, gridTemplateColumns, index }: RowProps<T>, ref: ForwardedRef<HTMLDivElement>) {
  const meta = table.options.meta;
  const href = meta?.rowHref?.(row);
  const onClick: React.MouseEventHandler<HTMLDivElement> | undefined = useMemo(() => {
    return meta?.rowOnClick ? (event) => meta.rowOnClick?.(event, row) : undefined;
  }, [meta, row]);
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
          typeof overIndex === "number" && onDragAndDrop?.(draggedId, index);
        }
      },
    },
    [row.id, originalIndex, onDragAndDrop, findRow]
  );

  const [{ isDragging }, dragRef, previewRef] = useDrag(
    {
      type: "row",
      item: { id: row.id, originalIndex },
      collect: (monitor) => {
        return {
          isDragging: monitor.isDragging(),
        };
      },
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
      <ConditionalWrapper
        condition={!!href}
        wrapper={(children) => (
          <Link href={href as string} passHref>
            {children}
          </Link>
        )}
      >
        <BodyTrWrapper
          ref={(node) => {
            previewRef(node);
            typeof ref === "function" && ref(node);
          }}
          sx={{ opacity: isDragging ? 0 : 1, backgroundColor: index % 2 ? "#f8f8f8" : "#ffffff" }}
          data-index={index}
          onClick={onClick}
          as={href ? "a" : undefined}
        >
          <BodyTr sx={{ gridTemplateColumns }} ref={dropRef}>
            {row.getVisibleCells().map((cell) => (
              <DataCell key={cell.id}>
                {!isMedium && <DataCellHeaderContent>{flexRender(cell.column.columnDef.header, cell.getContext())}</DataCellHeaderContent>}
                <DataCellContent>{flexRender(cell.column.columnDef.cell, cell.getContext())}</DataCellContent>
              </DataCell>
            ))}
          </BodyTr>
        </BodyTrWrapper>
      </ConditionalWrapper>
    </DragConnectSourceContext.Provider>
  );
}

const TableWrapper = styled("div")(
  sx({
    overflowX: "auto",
  })
);

const StyledTable = styled("div")(
  sx({
    width: "fit-content",
    minWidth: "100%",
    overflowWrap: "anywhere",
    hyphens: "auto",
  })
);

const Thead = styled("div")(sx({ fontWeight: 700, color: "#7A7A7A", paddingBottom: { md: 2 }, textAlign: "left" }));
const Cell = styled("div")(sx({}));
const HeaderCell = styled(Cell)(({ onClick }) =>
  sx({
    cursor: onClick ? "pointer" : undefined,
  })
);
const DataCell = styled(Cell)(sx({}));
const DataCellContent = styled("div")({});
const DataCellHeaderContent = styled(DataCellContent)({ fontWeight: 700 });
const HeaderCellContents = styled("div")(sx({}));

const Tbody = styled("div")(sx({}));
const TbodyWrapper = styled("div")(
  sx({
    width: "100%",
    position: "relative",
  })
);

const Tr = styled("div")(
  sx({
    display: { xs: "flex", md: "grid" },
    flexDirection: { xs: "column", md: null },
    paddingLeft: 4,
    paddingRight: 4,
    rowGap: 2,
    columnGap: 4,
  })
);

const BodyTrWrapper = styled("div")(
  sx({
    display: "block",
    borderBottomWidth: "2px",
    borderBottomColor: "#49c2f1",
    borderBottomStyle: "solid",
    paddingTop: { xs: 4, md: 7.5 },
    paddingBottom: { xs: 4, md: 7.5 },
  })
);

const BodyTr = styled(Tr)(sx({}));
