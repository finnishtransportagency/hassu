import React from "react";

interface Props {
  label?: string;
}

const RadioButton = (
  {
    label,
    ...props
  }: Props & Omit<React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>, "ref">,
  ref: React.ForwardedRef<HTMLInputElement>
) => (
  <label>
    <input type="radio" {...props} ref={ref} />
    <span className="pl-3 pr-6">{label}</span>
  </label>
);

export default React.forwardRef(RadioButton);
