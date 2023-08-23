import React, { ReactElement, ReactNode } from "react";
import { styled, experimental_sx as sx } from "@mui/material";

interface Props {
  children?: ReactNode;
  styles?: Record<string, any>;
  listItemStyles?: Record<string, any>;
}

export default function ListWithAlternatingBGColors({ children, styles, listItemStyles }: Props): ReactElement {
  return (
    <DescriptionList styles={styles} listItemStyles={listItemStyles}>
      {children}
    </DescriptionList>
  );
}

const DescriptionList = styled("ul")((props: Props) => {
  return sx({
    ...props.styles,
    "& > *": {
      borderBottom: "2px #49c2f1 solid!important",
      "&:nth-of-type(2n)": {
        backgroundColor: "rgb(248 248 248)!important",
      },
      ...props.listItemStyles,
    },
  });
});
