import React from "react";
import { StyledSpan } from "./RadioButton";
import { styled, experimental_sx as sx } from "@mui/material";

interface Props {
  label?: string;
}

const CheckBox = (
  {
    label,
    className,
    style,
    ...props
  }: Props & Omit<React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>, "ref">,
  ref: React.ForwardedRef<HTMLInputElement>
) => {
  return (
    <CheckboxLabel htmlFor={props?.id} className={className} style={style}>
      <input type="checkbox" className={className} {...props} ref={ref} />
      <StyledSpan>{label}</StyledSpan>
    </CheckboxLabel>
  );
};

const CheckboxLabel = styled("label")(
  sx({
    display: "inline-flex",
    "& > input[type=checkbox]": {
      height: "24px",
    },
  })
);

export default React.forwardRef(CheckBox);
