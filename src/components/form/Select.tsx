import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import classNames from "classnames";
import React from "react";
import { FieldError } from "react-hook-form";
import FormGroup from "./FormGroup";

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

interface Props {
  error?: FieldError;
  label?: string;
  hideErrorMessage?: boolean;
  options: SelectOption[];
  emptyOption?: string;
}

const Select = (
  {
    error,
    label,
    options,
    hideErrorMessage,
    emptyOption,
    className,
    ...props
  }: Props & Omit<React.DetailedHTMLProps<React.SelectHTMLAttributes<HTMLSelectElement>, HTMLSelectElement>, "ref" | "children">,
  ref: React.ForwardedRef<HTMLSelectElement>
) => {
  return (
    <FormGroup label={label} controlName={props.name} className={className} errorMessage={hideErrorMessage ? undefined : error?.message}>
      <div className="select-wrapper">
        <select className={classNames("hassu-input", error && "error")} {...props} ref={ref}>
          {emptyOption && <option value="">{emptyOption}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        {!props.disabled && (
          <FontAwesomeIcon
            icon="chevron-down"
            className={classNames("absolute right-3 pointer-events-none text-primary-dark")}
            style={{ top: `calc(50% - 0.5rem)` }}
          />
        )}
      </div>
    </FormGroup>
  );
};

export default React.forwardRef(Select);
