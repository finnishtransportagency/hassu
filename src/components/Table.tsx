import React, { Fragment, useEffect } from "react";
import { useTable, usePagination as usePaginationHook, CellProps, TableOptions, PluginHook } from "react-table";
import { styled, experimental_sx as sx } from "@mui/material";
import Link from "next/link";

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

  const tableHooks: PluginHook<T>[] = [];

  if (usePagination) {
    tableHooks.push(usePaginationHook);
  }

  const {
    getTableProps,
    getTableBodyProps,
    headers,
    prepareRow,
    page,
    rows,
    canPreviousPage,
    canNextPage,
    pageOptions,
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
  const nextPage = () => gotoPage(pageIndex + 1);
  const previousPage = () => gotoPage(pageIndex - 1);

  const data = usePagination ? page : rows;

  // Render the UI for your table
  return (
    <>
      <div style={{ overflowX: "auto", width: "100%" }}>
        <StyledTable {...getTableProps()}>
          {/* <ColGroup>
            {headers
              .filter((column) => column.isVisible)
              .map((column, index) => (
                <Col
                  key={index}
                  // sx={{ width: `calc(100% / ${colFractions} * ${fraction})` }}
                />
              ))}
          </ColGroup> */}
          <Thead>
            <Tr>
              {headers
                .filter((column) => column.isVisible)
                .map((column) => (
                  <HeaderCell {...column.getHeaderProps()} key={column.getHeaderProps().key}>
                    {column.render("Header")}
                    <span>{column.isSorted ? (column.isSortedDesc ? " 🔽" : " 🔼") : ""}</span>
                  </HeaderCell>
                ))}
            </Tr>
          </Thead>
          <Tbody {...getTableBodyProps()}>
            {data.map((row) => {
              prepareRow(row);
              return rowLink ? (
                <Link key={row.getRowProps().key} passHref href={rowLink(row.values as any)}>
                  <BodyTr as="a" {...row.getRowProps()} key={row.getRowProps().key}>
                    {row.cells.map((cell) => (
                      <Fragment key={cell.getCellProps().key}>
                        <BodyHeaderCell {...cell.column.getHeaderProps()}>
                          {cell.column.render("Header")}
                        </BodyHeaderCell>
                        <DataCell {...cell.getCellProps()}>{cell.render("Cell")}</DataCell>
                      </Fragment>
                    ))}
                  </BodyTr>
                </Link>
              ) : (
                <BodyTr {...row.getRowProps()} key={row.getRowProps().key}>
                  {row.cells.map((cell) => (
                    <Fragment key={cell.getCellProps().key}>
                      <BodyHeaderCell {...cell.column.getHeaderProps()}>{cell.column.render("Header")}</BodyHeaderCell>
                      <DataCell {...cell.getCellProps()}>{cell.render("Cell")}</DataCell>
                    </Fragment>
                  ))}
                </BodyTr>
              );
            })}
          </Tbody>
        </StyledTable>
      </div>
      {usePagination && (
        <div>
          <button onClick={() => gotoPage(0)} disabled={!canPreviousPage}>
            {"<<"}
          </button>{" "}
          <button onClick={previousPage} disabled={!canPreviousPage}>
            {"<"}
          </button>{" "}
          <button onClick={nextPage} disabled={!canNextPage}>
            {">"}
          </button>{" "}
          <button onClick={() => gotoPage(pageCount - 1)} disabled={!canNextPage}>
            {">>"}
          </button>{" "}
          <span>
            Page{" "}
            <strong>
              {pageIndex + 1} of {pageOptions.length}
            </strong>{" "}
          </span>
        </div>
      )}
    </>
  );
}

export default Table;

// const ColGroup = styled("div")(
//   sx({
//     display: "table-column-group",
//   })
// );

// const Col = styled("div")(
//   sx({
//     display: "table-column",
//     minWidth: "110px",
//     maxWidth: "500px",
//   })
// );

const StyledTable = styled("div")(
  sx({
    backgroundColor: "#FFFFFF",
    display: { xs: "block", md: "table" },
    tableLayout: "fixed",
    minWidth: "100%",
    wordBreak: "normal",
    overflowWrap: "normal",
  })
);

const Thead = styled("div")(
  sx({
    display: { xs: "none", md: "table-header-group" },
  })
);

const Tr = styled("div")(
  sx({
    display: { xs: "block", md: "table-row" },
  })
);

const BodyTr = styled(Tr)(
  sx({
    ":nth-of-type(odd)": {
      backgroundColor: "#F8F8F8",
    },
    borderBottomWidth: { xs: "2px", md: undefined },
    borderBottomColor: { xs: "#49c2f1", md: undefined },
    borderBottomStyle: { xs: "solid", md: undefined },
    paddingTop: { xs: 4, md: 7.5 },
    paddingBottom: { xs: 4, md: 7.5 },
    paddingLeft: { xs: 4, md: undefined },
    paddingRight: { xs: 4, md: undefined },
  })
);

const Tbody = styled("div")(
  sx({
    display: { xs: "block", md: "table-row-group" },
  })
);

const Cell = styled("div")(
  sx({
    display: { xs: "block", md: "table-cell" },
    paddingLeft: { md: 4 },
    ":first-of-type": {
      paddingLeft: { md: 4 },
    },
    ":last-of-type": {
      paddingRight: { md: 4 },
    },
  })
);

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
  })
);

const DataCell = styled(Cell)(
  sx({
    borderBottomWidth: { md: "2px" },
    borderBottomColor: { md: "#49c2f1" },
    borderBottomStyle: { md: "solid" },
    paddingTop: { md: 7.5 },
    paddingBottom: { xs: 2, md: 7.5 },
    ":last-of-type": {
      paddingBottom: { xs: 0 },
    },
    height: { md: "85px" },
  })
);
