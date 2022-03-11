import React, { ReactElement, ReactNode } from "react";
import { styled, experimental_sx as sx } from "@mui/material";
import isPropValid from "@emotion/is-prop-valid";

interface Props {
  noDivider?: boolean;
  children?: ReactNode;
  smallGaps?: boolean;
}

function Section({ children, noDivider, ...rest }: Props): ReactElement {
  return (
    <>
      <StyledSection {...rest}>{children}</StyledSection>
      {!noDivider && <hr />}
    </>
  );
}

const StyledSection = styled("section", { shouldForwardProp: isPropValid })((props: Props) =>
  sx({
    marginBottom: 12,
    marginTop: 7,
    "& > *": { margin: 0 },
    "& > * + *": {
      marginTop: props.smallGaps ? 4 : 7,
    },
  })
);

export default Section;
