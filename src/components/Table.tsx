import React, { ReactElement, ReactNode, Fragment } from "react";
import { styled, experimental_sx as sx } from "@mui/material";
import Link from "next/link";

interface ColumnData<T> {
  header: string;
  data: (rowData: T) => string | ReactNode | undefined;
  fraction?: number;
}

interface Props<T> {
  isLoading?: boolean;
  cols: ColumnData<T>[];
  rows: T[];
  rowLink?: (rowData: T) => string;
}

export default function Table<T extends unknown>({ isLoading, rows, cols, rowLink }: Props<T>): ReactElement {
  const colFractions = cols.reduce((acc, col) => acc + (col.fraction || 1), 0);
  return (
    <div style={{ overflowX: "auto", width: "100%" }}>
      <StyledTable>
        <ColGroup>
          {cols.map(({ fraction }, index) => (
            <Col key={index} sx={{ width: `calc(100% / ${colFractions} * ${fraction})` }} />
          ))}
        </ColGroup>
        <Thead>
          <Tr>
            {cols.map(({ header }, index) => (
              <HeaderCell key={index}>{header}</HeaderCell>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {isLoading
            ? Array.from({ length: 3 }, (_, index) => (
                <BodyTr key={index}>
                  {cols.map(({ header }, index) => (
                    <Fragment key={index}>
                      <BodyHeaderCell>{header}</BodyHeaderCell>
                      <DataCell>
                        <div className="bg-gray h-4 min-w-xs md:w-full rounded-md mr-0 my-1 align-middle" />
                      </DataCell>
                    </Fragment>
                  ))}
                </BodyTr>
              ))
            : rows.map((row, index) =>
                rowLink ? (
                  <Link key={index} passHref href={rowLink(row)}>
                    <BodyTr as="a">
                      {cols.map(({ data, header }, index) => (
                        <Fragment key={index}>
                          <BodyHeaderCell>{header}</BodyHeaderCell>
                          <DataCell>{data(row) || "-"}</DataCell>
                        </Fragment>
                      ))}
                    </BodyTr>
                  </Link>
                ) : (
                  <BodyTr key={index}>
                    {cols.map(({ data, header }, index) => (
                      <Fragment key={index}>
                        <BodyHeaderCell>{header}</BodyHeaderCell>
                        <DataCell>{data(row) || "-"}</DataCell>
                      </Fragment>
                    ))}
                  </BodyTr>
                )
              )}
        </Tbody>
      </StyledTable>
    </div>
  );
}

const ColGroup = styled("div")(
  sx({
    display: "table-column-group",
  })
);

const Col = styled("div")(
  sx({
    display: "table-column",
    minWidth: "110px",
    maxWidth: "500px",
  })
);

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
