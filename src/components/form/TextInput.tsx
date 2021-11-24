import React, { useState } from "react";
import { FieldError } from "react-hook-form";
import FormGroup from "./FormGroup";

interface Props {
  error?: FieldError;
  maxLength?: number;
  label?: string;
  hideErrorMessage?: boolean;
}

const TextInput = (
  {
    maxLength,
    error,
    label,
    hideErrorMessage,
    className,
    ...props
  }: Props & Omit<React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>, "ref">,
  ref: React.ForwardedRef<HTMLInputElement>
) => {
  const [length, setLength] = useState(0);

  return (
    <FormGroup
      label={label}
      errorMessage={hideErrorMessage ? undefined : error?.message}
      className={className}
      bottomInfo={
        typeof maxLength === "number" && (
          <span className={`ml-auto whitespace-nowrap ${length > maxLength ? "text-red" : "text-gray"}`}>
            {length} / {maxLength}
          </span>
        )
      }
    >
      <input
        type="text"
        {...props}
        ref={ref}
        onChange={(event) => {
          props?.onChange?.(event);
          setLength(event.target.value.length);
        }}
        className={error ? "error" : ""}
      />
    </FormGroup>
  );
};

export default React.forwardRef(TextInput);
