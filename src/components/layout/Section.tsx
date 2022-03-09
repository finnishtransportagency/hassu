import React, { ReactElement, ReactNode } from "react";
import { styled, experimental_sx as sx } from "@mui/material";

interface Props {
  noDivider?: boolean;
  children?: ReactNode;
  smallGaps?: boolean;
}

function Section({ children, ...rest }: Props): ReactElement {
  return (
    <>
      <StyledSection {...rest}>{children}</StyledSection>
      {!rest.noDivider && <hr />}
    </>
  );
}

const StyledSection = styled("section")((props: Props) =>
  sx({
    marginBottom: 12,
    marginTop: 7,
    "& > * + *": {
      marginTop: props.smallGaps ? 4 : 7,
    },
  })
);

export default Section;
