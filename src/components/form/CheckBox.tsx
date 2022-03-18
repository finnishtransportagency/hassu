import React from "react";
import { StyledSpan } from "./RadioButton";

interface Props {
  label?: string;
}

const CheckBox = (
  {
    label,
    ...props
  }: Props & Omit<React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>, "ref">,
  ref: React.ForwardedRef<HTMLInputElement>
) => {
  return (
    <label htmlFor={props?.id}>
      <input type="checkbox" {...props} ref={ref} />
      <StyledSpan>{label}</StyledSpan>
    </label>
  );
};

export default React.forwardRef(CheckBox);
