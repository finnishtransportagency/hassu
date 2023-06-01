import { Pagination, useMediaQuery } from "@mui/material";
import { Row, Table, TableOptions, flexRender, useReactTable } from "@tanstack/react-table";
import React, { ComponentProps, useMemo } from "react";
import { styled, experimental_sx as sx } from "@mui/system";
import ContentSpacer from "./layout/ContentSpacer";
import { breakpoints } from "./layout/HassuMuiThemeProvider";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/dist/client/link";

export type HassuTableProps<T> = {
  tableOptions: TableOptions<T>;
  rowOnClick?: (event: React.MouseEvent<HTMLElement, MouseEvent>, row: Row<T>) => void;
  rowLink?: (row: Row<T>) => string;
};

const DEFAULT_COL_MIN_WIDTH = 170;
const DEFAULT_COL_WIDTH_FRACTIONS = 1;

export default function HassuTable<T>(props: HassuTableProps<T>) {
  const table = useReactTable(props.tableOptions);

  const gridTemplateColumns: string = useMemo(() => {
    return table
      .getAllColumns()
      .map((column) => {
        const minWidth = column.columnDef.meta?.minWidth ?? DEFAULT_COL_MIN_WIDTH;
        const widthFractions = column.columnDef.meta?.widthFractions ?? DEFAULT_COL_WIDTH_FRACTIONS;
        return `minmax(${minWidth}px, ${widthFractions}fr)`;
      })
      .join(" ");
  }, [table]);

  return (
    <ContentSpacer gap={7}>
      <HassuTablePagination table={table} />
      <TableWrapper>
        <StyledTable sx={{ gridTemplateColumns }}>
          <TableHead table={table} />
          <Tbody>
            {table.getRowModel().rows.map((row) => (
              <FunctionalRow row={row} rowOnClick={props.rowOnClick} rowLink={props.rowLink} key={row.id} />
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
              <HeaderCell key={header.id} onClick={header.column.getToggleSortingHandler()}>
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

const Thead = styled("div")(sx({ display: "contents" }));
const Tbody = styled("div")(sx({ display: "contents" }));

type FunctionalRowProps<T> = {
  row: Row<T>;
} & Pick<HassuTableProps<T>, "rowOnClick" | "rowLink">;

type RowProps<T> = {
  row: Row<T>;
};

function FunctionalRow<T>(props: FunctionalRowProps<T>) {
  const href = props.rowLink?.(props.row);
  const onClick: React.MouseEventHandler<HTMLDivElement> | undefined = useMemo(() => {
    return props.rowOnClick ? (event) => props.rowOnClick?.(event, props.row) : undefined;
  }, [props]);

  return href ? (
    <Link href={href} passHref>
      <BasicRowWithoutStyles as="a" onClick={onClick} row={props.row} />
    </Link>
  ) : (
    <BasicRowWithoutStyles onClick={onClick} row={props.row} />
  );
}

function BasicRowWithoutStyles<T>({ row, ...props }: RowProps<T> & ComponentProps<typeof BodyTr>) {
  const isMedium = useMediaQuery(`(min-width: ${breakpoints.values?.md}px)`);
  return (
    <BodyTr {...props}>
      {row.getVisibleCells().map((cell) => (
        <DataCell key={cell.id}>
          {!isMedium && <BodyHeaderCell>{flexRender(cell.column.columnDef.header, cell.getContext())}</BodyHeaderCell>}
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </DataCell>
      ))}
    </BodyTr>
  );
}

const StyledTable = styled("div")(
  sx({
    display: "grid",
    width: "100%",
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
    display: "contents",
  })
);

const BodyTr = styled(Tr)(
  sx({
    ":nth-of-type(odd) > div": {
      backgroundColor: "#f8f8f8",
    },
  })
);

const Cell = styled("div")(
  sx({
    ":first-of-type": { paddingLeft: 4 },
    ":last-of-type": { paddingRight: 4 },
    paddingLeft: 2,
    paddingRight: 2,
    paddingTop: { xs: 4, md: 7.5 },
    paddingBottom: { xs: 4, md: 7.5 },
  })
);

const HeaderCell = styled(Cell)(({ onClick }) =>
  sx({
    paddingBottom: { md: 2 },
    color: "#7A7A7A",
    textAlign: "left",
    cursor: onClick ? "pointer" : undefined,
  })
);

const BodyHeaderCell = styled(Cell)(sx({}));

const DataCell = styled(Cell)(
  sx({
    borderBottomWidth: "2px",
    borderBottomColor: "#49c2f1",
    borderBottomStyle: "solid",
  })
);
