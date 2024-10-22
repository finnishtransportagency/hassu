import React from "react";
import { styled, experimental_sx as sx } from "@mui/material";
import isPropValid from "@emotion/is-prop-valid";

interface Props {
  label?: string;
}

const RadioButton = (
  { label, ...props }: Props & Omit<React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>, "ref">,
  ref: React.ForwardedRef<HTMLInputElement>
) => (
  <label>
    <input type="radio" {...props} ref={ref} />
    <StyledSpan>{label}</StyledSpan>
  </label>
);

export const StyledSpan = styled("span", { shouldForwardProp: isPropValid })(
  sx({
    marginLeft: 3,
    marginRight: 7.5,
  })
);

export default React.forwardRef(RadioButton);
