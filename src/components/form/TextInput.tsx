import classNames from "classnames";
import React, { useState } from "react";
import { FieldError } from "react-hook-form";
import FormGroup from "./FormGroup";

interface Props {
  error?: FieldError;
  label?: string;
  hideErrorMessage?: boolean;
  hideLengthCounter?: boolean;
}

const TextInput = (
  {
    maxLength = 200,
    error,
    label,
    hideErrorMessage,
    className,
    style,
    hideLengthCounter = true,
    ...props
  }: Props & Omit<React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>, "ref">,
  ref: React.ForwardedRef<HTMLInputElement>
) => {
  const [length, setLength] = useState(0);

  return (
    <FormGroup
      label={label}
      controlName={props.name}
      errorMessage={hideErrorMessage ? undefined : error?.message}
      className={className}
      style={style}
      bottomInfo={
        typeof maxLength === "number" &&
        !hideLengthCounter && (
          <span className={classNames("ml-auto whitespace-nowrap", length > maxLength ? "text-red" : "text-gray")}>
            {length} / {maxLength}
          </span>
        )
      }
    >
      <input
        type="text"
        maxLength={maxLength}
        {...props}
        ref={ref}
        onChange={(event) => {
          props?.onChange?.(event);
          setLength(event.target.value.length);
        }}
        className={classNames("hassu-input", error && "error")}
      />
    </FormGroup>
  );
};

export default React.forwardRef(TextInput);
