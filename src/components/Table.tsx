import React, { useEffect } from "react";
import {
  useTable,
  usePagination as usePaginationHook,
  CellProps,
  TableOptions,
  PluginHook,
  useFlexLayout,
} from "react-table";
import { styled, experimental_sx as sx } from "@mui/material";
import Link from "next/link";
import Pagination from "@mui/material/Pagination";
import SectionContent from "@components/layout/SectionContent";
import { breakpoints } from "@pages/_app";
import useMediaQuery from "../hooks/useMediaQuery";

interface PaginationControlledProps<T extends object> {
  rowLink?: (rowData: T) => string;
  tableOptions: TableOptions<T>;
  onPageChange?: (props: { pageSize: number; pageIndex: number }) => void | Promise<void>;
  gotoPage?: (updater: number) => void;
  usePagination?: boolean;
}

// Let's add a fetchData method to our Table component that will be used to fetch
// new data when pagination state changes
// We can also add a loading state to let our table know it's loading new data
export function Table<T extends object>({
  tableOptions,
  onPageChange,
  gotoPage: controlledGotoPage,
  rowLink,
  usePagination,
}: PaginationControlledProps<T>) {
  const defaultTableOptions: Partial<TableOptions<T>> = {
    defaultColumn: { Cell: ({ value }: CellProps<T>) => value || "-" },
  };

  const tableHooks: PluginHook<T>[] = [useFlexLayout];

  if (usePagination) {
    tableHooks.push(usePaginationHook);
  }

  const {
    getTableProps,
    headerGroups,
    prepareRow,
    page,
    rows,
    pageCount,
    gotoPage: uncontrolledGotoPage,
    // Get the state from the instance
    state: { pageIndex, pageSize },
  } = useTable<T>({ ...defaultTableOptions, ...tableOptions }, ...tableHooks);

  // const colFractions = tableOptions.columns.reduce((acc, col) => acc + (col.fraction || 1), 0);

  useEffect(() => {
    onPageChange?.({ pageSize, pageIndex });
  }, [onPageChange, pageSize, pageIndex]);

  const gotoPage = controlledGotoPage || uncontrolledGotoPage;

  const data = usePagination ? page : rows;

  const isMedium = useMediaQuery(`(min-width: ${breakpoints.values?.md}px)`);

  // Render the UI for your table
  return (
    <SectionContent largeGaps>
      {usePagination && (
        <Pagination
          count={pageCount}
          page={pageIndex + 1}
          onChange={(_, pageIndex) => gotoPage(pageIndex - 1)}
          showFirstButton
          showLastButton
          color="primary"
          sx={{
            ".MuiPagination-ul": { justifyContent: "flex-end" },
          }}
        />
      )}
      <StyledTable {...getTableProps({ style: { minWidth: "100%" } })}>
        {headerGroups.map((headerGroup) => {
          const { key: headerGroupKey, ...headerGroupProps } = headerGroup.getHeaderGroupProps();
          return (
            <Tr {...headerGroupProps} key={headerGroupKey}>
              {headerGroup.headers.map((column) => {
                const { key: headerKey, style, ...headerProps } = column.getHeaderProps();
                return (
                  <HeaderCell {...headerProps} style={isMedium ? style : { display: "none" }} key={headerKey}>
                    {column.render("Header")}
                    <span>{column.isSorted ? (column.isSortedDesc ? " 🔽" : " 🔼") : ""}</span>
                  </HeaderCell>
                );
              })}
            </Tr>
          );
        })}
        {data.map((row) => {
          prepareRow(row);
          const { key: rowKey, style: rowStyle, ...rowProps } = row.getRowProps();
          return rowLink ? (
            <Link key={rowKey} passHref href={rowLink(row.values as any)}>
              <BodyTr as="a" style={isMedium ? rowStyle : undefined} {...rowProps}>
                {row.cells.map((cell) => {
                  const { key: cellKey, style: cellStyle, ...cellProps } = cell.getCellProps();
                  return (
                    <DataCell {...cellProps} style={isMedium ? cellStyle : undefined} key={cellKey}>
                      <BodyHeaderCell {...cell.column.getHeaderProps()}>{cell.column.render("Header")}</BodyHeaderCell>
                      {cell.render("Cell")}
                    </DataCell>
                  );
                })}
              </BodyTr>
            </Link>
          ) : (
            <BodyTr {...rowProps} style={isMedium ? rowStyle : undefined} key={rowKey}>
              {row.cells.map((cell) => {
                const { key: cellKey, style: cellStyle, ...cellProps } = cell.getCellProps();
                return (
                  <DataCell {...cellProps} style={isMedium ? cellStyle : undefined} key={cellKey}>
                    <BodyHeaderCell {...cell.column.getHeaderProps()}>{cell.column.render("Header")}</BodyHeaderCell>
                    {cell.render("Cell")}
                  </DataCell>
                );
              })}
            </BodyTr>
          );
        })}
      </StyledTable>
      {usePagination && (
        <Pagination
          count={pageCount}
          page={pageIndex + 1}
          onChange={(_, pageIndex) => gotoPage(pageIndex - 1)}
          showFirstButton
          showLastButton
          color="primary"
          sx={{
            ".MuiPagination-ul": { justifyContent: "flex-end" },
          }}
        />
      )}
    </SectionContent>
  );
}

export default Table;

const StyledTable = styled("div")(
  sx({
    display: "block",
    backgroundColor: "#ffffff",
    overflowX: { md: "auto" },
    wordBreak: "normal",
    overflowWrap: "normal",
  })
);

const Tr = styled("div")(
  sx({
    paddingLeft: 4,
    paddingRight: 4,
    columnGap: 4,
    rowGap: 2,
    minWidth: "fit-content !important",
  })
);

const BodyTr = styled(Tr)(
  sx({
    display: "flex",
    flexDirection: { xs: "column", md: "row" },
    ":nth-of-type(odd)": {
      backgroundColor: "#f8f8f8",
    },
    paddingTop: { xs: 4, md: 7.5 },
    paddingBottom: { xs: 4, md: 7.5 },
    minHeight: "85px",
    borderBottomWidth: "2px",
    borderBottomColor: "#49c2f1",
    borderBottomStyle: "solid",
  })
);

const Cell = styled("div")(sx({}));

const HeaderCell = styled(Cell)(
  sx({
    paddingBottom: { md: 2 },
    color: "#7A7A7A",
  })
);

const BodyHeaderCell = styled(Cell)(
  sx({
    display: { xs: "block", md: "none" },
    fontWeight: 700,
    "& > * + *": {
      paddingTop: 2,
    },
  })
);

const DataCell = styled(Cell)(sx({}));
