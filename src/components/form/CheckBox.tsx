import classNames from "classnames";
import React from "react";
import { FieldError } from "react-hook-form";

interface Props {
  error?: FieldError;
  label?: string;
  hideErrorMessage?: boolean;
  hideLengthCounter?: boolean;
}

const CheckBox = (
  {
    maxLength = 200,
    error,
    label,
    hideErrorMessage,
    className,
    hideLengthCounter = true,
    ...props
  }: Props & Omit<React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>, "ref">,
  ref: React.ForwardedRef<HTMLInputElement>
) => {
  return (
    <label className="block" htmlFor={props?.id}>
      <input type="checkbox" maxLength={maxLength} {...props} ref={ref} className={classNames(error && "error")} />
      &nbsp;{label}
    </label>
  );
};

export default React.forwardRef(CheckBox);
