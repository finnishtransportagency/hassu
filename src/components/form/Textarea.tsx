import React, { ReactElement, useState } from "react";
import { FieldError } from "react-hook-form";
import FormGroup from "./FormGroup";
import classNames from "classnames";

type RegistrationValues = Pick<
  React.DetailedHTMLProps<React.TextareaHTMLAttributes<HTMLTextAreaElement>, HTMLTextAreaElement>,
  "name" | "value" | "onBlur" | "onChange" | "ref"
>;

interface Props {
  cols?: number;
  rows?: number;
  error?: FieldError;
  maxLength?: number;
  registrationValues?: RegistrationValues;
  label?: string;
  disabled?: boolean;
  hideErrorMessage?: boolean;
  readOnly?: boolean;
}

export default function Textarea({
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
          <span className={`ml-auto whitespace-nowrap ${length > maxLength ? "text-red" : "text-gray"}`}>
            {length} / {maxLength}
          </span>
        )
      }
    >
      <textarea
        {...fieldAttributes}
        onChange={(event) => {
          fieldAttributes?.onChange?.(event);
          setLength(event.target.value.length);
        }}
        className={classNames(error && "error")}
        disabled={disabled}
        readOnly={readOnly}
      />
    </FormGroup>
  );
}
