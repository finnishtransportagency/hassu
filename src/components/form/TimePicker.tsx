import classNames from "classnames";
import React from "react";
import { FieldError } from "react-hook-form";
import FormGroup from "./FormGroup";

interface Props {
  error?: FieldError;
  label?: string;
  hideErrorMessage?: boolean;
  hideLengthCounter?: boolean;
  formGroupClassName?: string;
}

const TimePicker = (
  {
    maxLength = 200,
    error,
    label,
    hideErrorMessage,
    className,
    formGroupClassName,
    ...props
  }: Props & Omit<React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>, "ref">,
  ref: React.ForwardedRef<HTMLInputElement>
) => {
  return (
    <FormGroup label={label} errorMessage={hideErrorMessage ? undefined : error?.message} className={formGroupClassName}>
      <input type={"time"} maxLength={maxLength} {...props} ref={ref} className={classNames("hassu-input", className, error && "error")} />
    </FormGroup>
  );
};

export default React.forwardRef(TimePicker);
