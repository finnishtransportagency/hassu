import { Stack } from "@mui/material";
import React, { ReactElement } from "react";

export interface KeyValueData {
  header: string;
  data?: string | null;
}

interface Props {
  rows: KeyValueData[];
}

export default function KeyValueTable({ rows }: Props): ReactElement {
  return (
    <Stack>
      {rows.map(({ header, data }, index) => (
        <div key={index} className="lg:grid lg:grid-cols-12">
          <div className="lg:col-span-4 xl:col-span-3 font-semibold lg:font-normal">{header}</div>
          <div className="lg:col-span-8 xl:col-span-9">{data || "-"}</div>
        </div>
      ))}
    </Stack>
  );
}
