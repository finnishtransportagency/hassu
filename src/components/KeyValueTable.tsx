import React, { Fragment, ReactElement } from "react";
import { styled, experimental_sx as sx } from "@mui/material";

export interface KeyValueData {
  header: string;
  data?: string | null;
}

interface Props {
  rows: KeyValueData[];
}

export default function KeyValueTable({ rows }: Props): ReactElement {
  return (
    <DescriptionList>
      {rows.map(({ header, data }, index) => (
        <Fragment key={index}>
          <dt className="font-semibold lg:font-normal">{header}</dt>
          <dd>{data || "-"}</dd>
        </Fragment>
      ))}
    </DescriptionList>
  );
}

const DescriptionList = styled("dl")(
  sx({
    "& > dd + dt": {
      marginTop: 4,
    },
    display: { lg: "inline-grid" },
    gridTemplateColumns: { lg: "repeat(2, 18rem)" },
    columnGap: { lg: 16 },
    "& > dd + dt + dd ": {
      marginTop: { lg: 4 },
    },
  })
);
