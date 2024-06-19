import { Checkbox, MenuItem, Pagination, Select } from "@mui/material";
import { ColumnDef, ColumnSort, HeaderContext, Row, SortType, Table, flexRender } from "@tanstack/react-table";
import React, { ComponentProps, ForwardedRef, createContext, forwardRef, useMemo } from "react";
import { styled, experimental_sx as sx } from "@mui/system";
import ContentSpacer from "../layout/ContentSpacer";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSort } from "@fortawesome/free-solid-svg-icons";
import { faSortUp } from "@fortawesome/free-solid-svg-icons";
import { faSortDown } from "@fortawesome/free-solid-svg-icons";
import Link from "next/dist/client/link";
import { ConnectDragSource, useDrag, useDrop } from "react-dnd";
import ConditionalWrapper from "../layout/ConditionalWrapper";
import { Virtualizer } from "@tanstack/react-virtual";
import isEqual from "lodash/isEqual";
import { useIsAboveBreakpoint } from "src/hooks/useIsSize";
import dynamic from "next/dynamic";
import { BodyContentVirtualWindowProps } from "./BodyContentVirtualWindow";
import { BodyContentVirtualElementProps } from "./BodyContentVirtualElement";
import {
  Tbody,
  TableWrapper,
  StyledTable,
  TbodyWrapper,
  Thead,
  Tr,
  HeaderCell,
  HeaderCellContents,
  BodyTrWrapper,
  BodyTr,
  DataCell,
  DataCellHeaderContent,
  DataCellContent,
} from "./StyledTableComponents";

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
    <Span
      sx={{
        display: "flex",
        justifyContent: "left",
        position: { xs: "absolute", md: "unset" },
        top: { xs: "7px", md: "unset" },
        right: { xs: "7px", md: "unset" },
      }}
    >
      <Checkbox
        checked={row.getIsSelected()}
        disabled={!row.getCanSelect()}
        indeterminate={row.getIsSomeSelected()}
        onChange={row.getToggleSelectedHandler()}
        name={row.id ? `select_row_${row.id}` : undefined}
      />
    </Span>
  ),
  meta: { minWidth: 100, widthFractions: 1 },
});

function SelectHeader<T>(props: HeaderContext<T, unknown>) {
  return (
    <Span
      sx={{
        display: { xs: "none", md: "flex" },
        justifyContent: "left",
        flexDirection: "column",
        alignItems: "left",
        width: "100%",
        margin: "auto",
      }}
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

export type VirtualizerTableProps = {
  type?: "window" | "scrollElement";
  virtualizer?: Virtualizer<Window, Element> | Virtualizer<Element, Element>;
  parentRef?: React.RefObject<HTMLDivElement>;
  bodySx?: ComponentProps<typeof Tbody>["sx"];
  tableSx?: ComponentProps<typeof Tbody>["sx"];
};

export default function HassuTable<T>({ table }: HassuTableProps<T>) {
  const isMedium = useIsAboveBreakpoint("md");

  const gridTemplateColumns = useMemo(() => {
    return table.options.columns
      .map<string>((column) => {
        const minWidth = column.meta?.minWidth ?? DEFAULT_COL_MIN_WIDTH;
        const fractions = column.meta?.widthFractions ?? DEFAULT_COL_WIDTH_FRACTIONS;
        return `minmax(${minWidth}px, ${fractions}fr)`;
      })
      .join(" ");
  }, [table.options.columns]);

  return (
    <ContentSpacer gap={7} style={{marginTop: "24px"}}>
      {!isMedium && table.options.enableSorting && <TableMobileSorting table={table} />}
      <HassuTablePagination table={table} />
      <TableWrapper>
        <StyledTable id={table.options.meta?.tableId}>
          {isMedium && <TableHead gridTemplateColumns={gridTemplateColumns} table={table} />}
          <TableBody table={table} gridTemplateColumns={gridTemplateColumns} />
        </StyledTable>
      </TableWrapper>
      <HassuTablePagination table={table} />
    </ContentSpacer>
  );
}

type PaginationProps<T> = {
  table: Table<T>;
};

const BodyContentVirWindow = dynamic(() => import("./BodyContentVirtualWindow"), { ssr: false });
const BodyContentVirElement = dynamic(() => import("./BodyContentVirtualElement"), {
  ssr: false,
});

function TableBody<T>({ gridTemplateColumns, table }: HassuTableProps<T> & { gridTemplateColumns: string }) {
  const virtualizationOptions = table.options.meta?.virtualization;

  if (virtualizationOptions?.type === "window") {
    const BodyContentVirtualWindow = BodyContentVirWindow as React.ComponentType<BodyContentVirtualWindowProps<T>>;
    return <BodyContentVirtualWindow table={table} gridTemplateColumns={gridTemplateColumns} />;
  } else if (virtualizationOptions?.type === "scrollElement" && virtualizationOptions?.getScrollElement) {
    const BodyContentVirtualWindow = BodyContentVirElement as React.ComponentType<BodyContentVirtualElementProps<T>>;
    return (
      <BodyContentVirtualWindow
        table={table}
        gridTemplateColumns={gridTemplateColumns}
        getScrollElement={virtualizationOptions.getScrollElement}
      />
    );
  } else {
    return <BodyContent gridTemplateColumns={gridTemplateColumns} table={table} />;
  }
}

export function BodyContent<T>(
  props: HassuTableProps<T> &
    VirtualizerTableProps & {
      gridTemplateColumns: string;
    }
) {
  const actualRows = props.table.getRowModel().rows;

  const rowVirtualizer = props?.virtualizer;

  const virtualRows = rowVirtualizer?.getVirtualItems();
  const rows = virtualRows?.map((virtualRow) => actualRows[virtualRow.index]) ?? actualRows;

  const [, dropRef] = useDrop(() => ({ accept: "row" }));

  return (
    <TbodyWrapper ref={props?.parentRef} sx={props.tableSx}>
      <Tbody sx={props?.bodySx} ref={dropRef}>
        {rows.map((row) => (
          <BasicRow
            gridTemplateColumns={props.gridTemplateColumns}
            row={row}
            table={props.table}
            index={row.index}
            key={row.id}
            ref={props?.virtualizer?.measureElement}
          />
        ))}
      </Tbody>
    </TbodyWrapper>
  );
}

function HassuTablePagination<T>({ table }: PaginationProps<T>) {
  const isMedium = useIsAboveBreakpoint("md");
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
            ".MuiPaginationItem-root.Mui-selected": {
              color: "#ffffff",
              backgroundColor: "#0064af",
            },
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
        <Tr key={headerGroup.id} sx={{ gridTemplateColumns, alignItems: "end" }}>
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
                  {isSorted && isSorted === "desc" && <FontAwesomeIcon className="ml-4" icon={faSortUp} />}
                  {isSorted && isSorted !== "desc" && <FontAwesomeIcon className="ml-4" icon={faSortDown} />}
                  {!isSorted && canSort && <FontAwesomeIcon className="ml-4" icon={faSort} />}
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
      value={selectedOption?.stringValue ?? null}
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

export const TableDragConnectSourceContext = createContext<ConnectDragSource | null>(null);

export const BasicRow = forwardRef(BasicRowWithoutStyles);

function BasicRowWithoutStyles<T>({ row, table, gridTemplateColumns, index }: RowProps<T>, ref: ForwardedRef<HTMLDivElement>) {
  const meta = table.options.meta;
  const href = meta?.rowHref?.(row);
  const onClick: React.MouseEventHandler<HTMLDivElement> | undefined = useMemo(() => {
    return meta?.rowOnClick ? (event) => meta.rowOnClick?.(event, row) : undefined;
  }, [meta, row]);
  const isMedium = useIsAboveBreakpoint("md");

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
    <TableDragConnectSourceContext.Provider value={dragRef}>
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
          sx={{
            boxShadow: isDragging
              ? "inset -16px 0px 14px -8px #FFFFFF, inset 16px 0px 14px -8px #FFFFFF, inset 0px 11px 8px -10px #999999, inset 0px -11px 8px -10px #999999"
              : undefined,
            borderBottom: !isDragging ? "2px #49c2f1 solid" : "unset",
            zIndex: isDragging ? 1 : "unset",
            backgroundColor: !isDragging && index % 2 ? "#F8F8F8" : "#FFFFFF",
          }}
          data-index={index}
          onClick={onClick}
          as={href ? "a" : undefined}
        >
          <BodyTr
            sx={{
              gridTemplateColumns,
              opacity: isDragging ? 0 : 1,
            }}
            ref={dropRef}
          >
            {row.getVisibleCells().map((cell) => (
              <DataCell key={cell.id}>
                {!isMedium && <DataCellHeaderContent>{flexRender(cell.column.columnDef.header, cell.getContext())}</DataCellHeaderContent>}
                <DataCellContent>{flexRender(cell.column.columnDef.cell, cell.getContext())}</DataCellContent>
              </DataCell>
            ))}
          </BodyTr>
        </BodyTrWrapper>
      </ConditionalWrapper>
    </TableDragConnectSourceContext.Provider>
  );
}
