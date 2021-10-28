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

export default function Textarea({
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
      </div>
      {error && !hideErrorMessage && (
        <div className="flex">
          <span className="text-secondary-red">{error.message}</span>
        </div>
      )}
    </FormGroup>
  );
}
