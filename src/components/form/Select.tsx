import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import classNames from "classnames";
import React, { ReactElement } from "react";
import { FieldError } from "react-hook-form";
import FormGroup from "./FormGroup";

type RegistrationValues = Pick<
  React.DetailedHTMLProps<React.SelectHTMLAttributes<HTMLSelectElement>, HTMLSelectElement>,
  "name" | "value" | "onBlur" | "onChange" | "ref"
>;

interface Props {
  error?: FieldError;
  registrationValues?: RegistrationValues;
  label?: string;
  disabled?: boolean;
  hideErrorMessage?: boolean;
  options: { label: string; value: string; disabled?: boolean }[];
}

export default function Select({
  error,
  registrationValues,
  label,
  disabled,
  options,
  hideErrorMessage,
}: Props): ReactElement {
  return (
    <FormGroup label={label} errorMessage={hideErrorMessage ? undefined : error?.message}>
      <div className="select-wrapper">
        <select disabled={disabled} className={error && "error"} {...registrationValues}>
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
            disabled ? "text-font-primary" : "text-primary-dark"
          )}
          style={{ top: `calc(50% - 0.5rem)` }}
        />
      </div>
      {error && !hideErrorMessage && (
        <div className="flex">
          <span className="text-red">{error.message}</span>
        </div>
      )}
    </FormGroup>
  );
}
