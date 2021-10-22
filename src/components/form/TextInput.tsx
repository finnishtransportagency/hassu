import React, { ReactElement, useState } from "react";
import { FieldError } from "react-hook-form";
import FormGroup from "./FormGroup";

type RegistrationValues = Pick<
  React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>,
  "name" | "value" | "onBlur" | "onChange" | "ref"
>;

interface Props {
  error?: FieldError;
  maxLength?: number;
  registrationValues?: RegistrationValues;
  label?: string;
  disabled?: boolean;
  hideErrorMessage?: boolean;
  readOnly?: boolean;
}

export default function TextInput({
  maxLength,
  error,
  registrationValues: fieldAttributes,
  label,
  disabled,
  readOnly,
  hideErrorMessage,
}: Props): ReactElement {
  const [length, setLength] = useState(0);

  return (
    <FormGroup
      label={label}
      errorMessage={hideErrorMessage ? undefined : error?.message}
      bottomInfo={
        typeof maxLength === "number" && (
          <span className={`ml-auto whitespace-nowrap ${length > maxLength ? "text-secondary-red" : "text-gray"}`}>
            {length} / {maxLength}
          </span>
        )
      }
    >
      <input
        type="text"
        {...fieldAttributes}
        onChange={(event) => {
          fieldAttributes?.onChange?.(event);
          setLength(event.target.value.length);
        }}
        className={error && "error"}
        disabled={disabled}
        readOnly={readOnly}
      />
    </FormGroup>
  );
}
