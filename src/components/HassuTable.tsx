import React from "react";
import { styled, experimental_sx as sx, Pagination, useMediaQuery } from "@mui/material";
import SectionContent from "@components/layout/SectionContent";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import Select from "@components/form/Select";
import { SortingRule, TableInstance } from "react-table";
import { breakpoints } from "./layout/HassuMuiThemeProvider";

export interface HassuTableProps<D extends object> {
  tableId?: string;
  tableInstance: TableInstance<D>;
  pageChanger?: (updater: number) => void;
  sortByChanger?: (sortBy: SortingRule<D>[]) => void;
  usePagination?: boolean;
  useSortBy?: boolean;
  useRowSelect?: boolean;
  rowLink?: (rowData: D) => string;
  rowOnClick?: (event: React.MouseEvent<HTMLElement, MouseEvent>, rowData: D) => void;
}

export const HassuTable = <D extends object>(props: HassuTableProps<D>) => {
  const { tableInstance, useSortBy, usePagination, useRowSelect, pageChanger, sortByChanger, rowLink, rowOnClick } = props;
  const isMedium = useMediaQuery(`(min-width: ${breakpoints.values?.md}px)`);

  const {
    getTableProps,
    headerGroups,
    prepareRow,
    columns,
    page,
    rows,
    pageCount,
    setSortBy: uncontrolledSetSortBy,
    gotoPage: uncontrolledGotoPage,
    // Get the state from the instance
    state: { pageIndex },
  } = tableInstance;

  const gotoPage = pageChanger || uncontrolledGotoPage;
  const setSortBy = sortByChanger || uncontrolledSetSortBy;

  const data = usePagination ? page : rows;

  const sortOptions = columns
    .filter((column) => column.isVisible && !column.disableSortBy && typeof column.Header?.toString() === "string")
    .reduce<{ label: string; value: string }[]>((acc, column) => {
      const header = column.Header!.toString();
      const id = column.id.toString();

      const columnIsDateTime = column.sortType === "datetime";

      const columnAsc = {
        label: header + ` ${columnIsDateTime ? " (vanhin ensin)" : "(A-Ö)"}`,
        value: JSON.stringify({ id, desc: false }),
      };
      const columnDesc = {
        label: header + ` ${columnIsDateTime ? " (uusin ensin)" : "(Ö-A)"}`,
        value: JSON.stringify({ id, desc: true }),
      };
      if (column.sortDescFirst) {
        acc.push(columnDesc);
        acc.push(columnAsc);
      } else {
        acc.push(columnAsc);
        acc.push(columnDesc);
      }
      return acc;
    }, []);

  return (
    <SectionContent largeGaps>
      {useSortBy && !isMedium && (
        <Select
          label="Järjestä"
          options={sortOptions}
          onChange={(event) => {
            setSortBy([JSON.parse(event.target.value)]);
          }}
        />
      )}
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
      <StyledTable {...getTableProps({ style: { minWidth: "100%" } })} id={props.tableId}>
        {headerGroups.map((headerGroup) => {
          const {
            key: headerGroupKey,
            style: headerGroupStyle,
            ...headerGroupProps
          } = headerGroup.getHeaderGroupProps({ style: { alignItems: "flex-end" } });
          return (
            <Tr {...headerGroupProps} style={isMedium ? headerGroupStyle : { display: "none" }} key={headerGroupKey}>
              {headerGroup.headers.map((column) => {
                const { key: headerKey, ...headerProps } = column.getHeaderProps(
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
                  <HeaderCell as={useSortBy && !column.disableSortBy ? "button" : undefined} {...headerProps} key={headerKey}>
                    {column.render("Header")}
                    {column.isSorted && <FontAwesomeIcon className="ml-4" icon={column.isSortedDesc ? "arrow-down" : "arrow-up"} />}
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
              <BodyTr
                as="a"
                style={isMedium ? rowStyle : undefined}
                onClick={rowOnClick ? (event) => rowOnClick?.(event, row.values as any) : undefined}
                {...rowProps}
              >
                {row.cells
                  .filter((cell) => isMedium || cell.column.id !== "selection")
                  .map((cell, index) => {
                    const { key: cellKey, style: cellStyle, ...cellProps } = cell.getCellProps();
                    const { style: headerStyles, ...headerProps } = cell.column.getHeaderProps();
                    return (
                      <DataCell {...cellProps} style={isMedium ? cellStyle : undefined} key={cellKey}>
                        {useRowSelect && !isMedium && index === 0 ? (
                          <>
                            <BodyHeaderCell {...headerProps} style={isMedium ? headerStyles : undefined}>
                              {cell.column.render("Header")}
                              {row.cells.find((cell) => cell.column.id === "selection")?.render("Cell")}
                            </BodyHeaderCell>
                            {cell.render("Cell")}
                          </>
                        ) : (
                          <>
                            <BodyHeaderCell {...headerProps} style={isMedium ? headerStyles : undefined}>
                              {cell.column.render("Header")}
                            </BodyHeaderCell>
                            {cell.render("Cell")}
                          </>
                        )}
                      </DataCell>
                    );
                  })}
              </BodyTr>
            </Link>
          ) : (
            <BodyTr
              {...rowProps}
              style={isMedium ? rowStyle : undefined}
              onClick={rowOnClick ? (event) => rowOnClick?.(event, row.values as any) : undefined}
              key={rowKey}
            >
              {row.cells
                .filter((cell) => isMedium || cell.column.id !== "selection")
                .map((cell, index) => {
                  const { key: cellKey, style: cellStyle, ...cellProps } = cell.getCellProps();
                  const { style: headerStyles, ...headerProps } = cell.column.getHeaderProps();
                  return (
                    <DataCell {...cellProps} style={isMedium ? cellStyle : undefined} key={cellKey}>
                      {useRowSelect && !isMedium && index === 0 ? (
                        <>
                          <BodyHeaderCell {...headerProps} style={isMedium ? headerStyles : undefined}>
                            {cell.column.render("Header")}
                            {row.cells.find((cell) => cell.column.id === "selection")?.render("Cell")}
                          </BodyHeaderCell>
                          {cell.render("Cell")}
                        </>
                      ) : (
                        <>
                          <BodyHeaderCell {...headerProps} style={isMedium ? headerStyles : undefined}>
                            {cell.column.render("Header")}
                          </BodyHeaderCell>
                          {cell.render("Cell")}
                        </>
                      )}
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
};

export default HassuTable;

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
    textAlign: "left",
  })
);

const BodyHeaderCell = styled(Cell)(
  sx({
    display: { xs: "flex", md: "none" },
    flexDirection: "row",
    justifyContent: "space-between",
    fontWeight: 700,
    "& > * + *": {
      paddingTop: 2,
    },
  })
);

const DataCell = styled(Cell)(sx({}));
