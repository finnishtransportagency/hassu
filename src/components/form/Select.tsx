import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import classNames from "classnames";
import React from "react";
import { FieldError } from "react-hook-form";
import FormGroup from "./FormGroup";

interface Props {
  error?: FieldError;
  label?: string;
  hideErrorMessage?: boolean;
  options: { label: string; value: string; disabled?: boolean }[];
}

const Select = (
  {
    error,
    label,
    options,
    hideErrorMessage,
    className,
    ...props
  }: Props &
    Omit<React.DetailedHTMLProps<React.SelectHTMLAttributes<HTMLSelectElement>, HTMLSelectElement>, "ref" | "children">,
  ref: React.ForwardedRef<HTMLSelectElement>
) => {
  return (
    <FormGroup label={label} className={className} errorMessage={hideErrorMessage ? undefined : error?.message}>
      <div className="select-wrapper">
        <select className={error && "error"} {...props} ref={ref}>
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <FontAwesomeIcon
          icon="chevron-down"
          className={classNames(
            "absolute right-3 pointer-events-none",
            props.disabled ? "text-font-primary" : "text-primary-dark"
          )}
          style={{ top: `calc(50% - 0.5rem)` }}
        />
      </div>
    </FormGroup>
  );
};

export default React.forwardRef(Select);
