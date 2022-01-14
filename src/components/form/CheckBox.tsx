import React from "react";

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
      <span className="pl-3 pr-6">{label}</span>
    </label>
  );
};

export default React.forwardRef(CheckBox);
