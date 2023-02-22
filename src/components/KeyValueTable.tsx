import React, { Fragment, ReactElement } from "react";
import { styled, experimental_sx as sx } from "@mui/material";

export interface KeyValueData {
  header: string;
  data?: string | null;
}

interface Props {
  rows: KeyValueData[];
  kansalaisnakyma?: boolean;
}

interface DescriptionListProps {
  kansalaisnakyma?: boolean;
}

export default function KeyValueTable({ rows, kansalaisnakyma }: Props): ReactElement {
  return (
    <DescriptionList kansalaisnakyma={kansalaisnakyma}>
      {rows.map(({ header, data }, index) => (
        <Fragment key={index}>
          <dt className={kansalaisnakyma ? "font-bold" : "font-semibold lg:font-normal"}>{header}</dt>
          <dd>{data || "-"}</dd>
        </Fragment>
      ))}
    </DescriptionList>
  );
}

const DescriptionList = styled("dl")((props: DescriptionListProps) => {
  return sx({
    "& > dd + dt": {
      marginTop: 4,
    },
    display: { lg: "inline-grid" },
    gridTemplateColumns: { lg: props.kansalaisnakyma ? "auto 18rem" : "repeat(2, 18rem)" },
    columnGap: { lg: 16 },
    "& > dd + dt + dd ": {
      marginTop: { lg: 4 },
    },
  });
});
