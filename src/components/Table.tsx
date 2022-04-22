import React from "react";
import {
  useTable,
  usePagination as usePaginationHook,
  CellProps,
  TableOptions,
  PluginHook,
  useFlexLayout,
  useSortBy as useSortByHook,
  SortingRule,
} from "react-table";
import { styled, experimental_sx as sx } from "@mui/material";
import Link from "next/link";
import Pagination from "@mui/material/Pagination";
import SectionContent from "@components/layout/SectionContent";
import { breakpoints } from "@pages/_app";
import useMediaQuery from "../hooks/useMediaQuery";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface PaginationControlledProps<T extends object> {
  rowLink?: (rowData: T) => string;
  tableOptions: TableOptions<T>;
  pageChanger?: (updater: number) => void;
  sortByChanger?: (sortBy: SortingRule<T>[]) => void;
  usePagination?: boolean;
  useSortBy?: boolean;
}

export function Table<T extends object>({
  tableOptions,
  pageChanger,
  sortByChanger,
  rowLink,
  usePagination,
  useSortBy,
}: PaginationControlledProps<T>) {
  const defaultTableOptions: Partial<TableOptions<T>> = {
    defaultColumn: { Cell: ({ value }: CellProps<T>) => value || "-" },
  };

  const tableHooks: PluginHook<T>[] = [useFlexLayout];

  if (useSortBy) {
    tableHooks.push(useSortByHook);
  }

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
    setSortBy: uncontrolledSetSortBy,
    gotoPage: uncontrolledGotoPage,
    // Get the state from the instance
    state: { pageIndex },
  } = useTable<T>({ ...defaultTableOptions, ...tableOptions }, ...tableHooks);

  const gotoPage = pageChanger || uncontrolledGotoPage;
  const setSortBy = sortByChanger || uncontrolledSetSortBy;

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
                const {
                  key: headerKey,
                  style,
                  ...headerProps
                } = column.getHeaderProps(
                  useSortBy
                    ? column.getSortByToggleProps({
                        title: undefined,
                        onClick: column.disableSortBy
                          ? undefined
                          : () => {
                              let desc: boolean | undefined;
                              if (column.isSorted) {
                                if (column.sortDescFirst) {
                                  desc = column.isSortedDesc ? false : undefined;
                                } else {
                                  desc = column.isSortedDesc ? undefined : true;
                                }
                              } else {
                                desc = column.sortDescFirst ? true : false;
                              }
                              setSortBy(desc === undefined ? [] : [{ desc, id: column.id }]);
                            },
                      })
                    : undefined
                );
                return (
                  <HeaderCell {...headerProps} style={isMedium ? style : { display: "none" }} key={headerKey}>
                    {column.render("Header")}
                    {column.isSorted && (
                      <FontAwesomeIcon className="ml-4" icon={column.isSortedDesc ? "arrow-down" : "arrow-up"} />
                    )}
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
                  const { style: headerStyles, ...headerProps } = cell.column.getHeaderProps();
                  return (
                    <DataCell {...cellProps} style={isMedium ? cellStyle : undefined} key={cellKey}>
                      <BodyHeaderCell {...headerProps} style={isMedium ? headerStyles : undefined}>
                        {cell.column.render("Header")}
                      </BodyHeaderCell>
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
                const { style: headerStyles, ...headerProps } = cell.column.getHeaderProps();
                return (
                  <DataCell {...cellProps} style={isMedium ? cellStyle : undefined} key={cellKey}>
                    <BodyHeaderCell {...headerProps} style={isMedium ? headerStyles : undefined}>
                      {cell.column.render("Header")}
                    </BodyHeaderCell>
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
