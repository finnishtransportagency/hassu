import classNames from "classnames";
import React from "react";
import { FieldError } from "react-hook-form";
import FormGroup from "./FormGroup";

interface Props {
  error?: FieldError;
  label?: string;
  hideErrorMessage?: boolean;
  hideLengthCounter?: boolean;
}

const DatePicker = (
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
    <FormGroup label={label} errorMessage={hideErrorMessage ? undefined : error?.message} className={className}>
      <input
        type="date"
        maxLength={maxLength}
        {...props}
        ref={ref}
        className={classNames(error && "error", "md:max-w-min")}
      />
    </FormGroup>
  );
};

export default React.forwardRef(DatePicker);
