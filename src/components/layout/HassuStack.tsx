import { Stack, StackProps } from "@mui/material";
import React, { ReactElement } from "react";

type HassuStackProps = Omit<StackProps, "spacing"> & { spacing?: 2 | 4 | 7 };

export default function HassuStack({ children, ...rest }: HassuStackProps): ReactElement {
  return <Stack {...rest}>{children}</Stack>;
}
