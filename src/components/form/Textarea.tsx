import React, { useState } from "react";
import { FieldError } from "react-hook-form";
import FormGroup from "./FormGroup";
import classNames from "classnames";
import TextareaAutosize from "@mui/base/TextareaAutosize";
import { TextareaAutosizeProps } from "@mui/material";

interface Props {
  error?: FieldError;
  label?: string;
  hideErrorMessage?: boolean;
  hideLengthCounter?: boolean;
}

const Textarea = (
  {
    maxLength = 2000,
    error,
    label,
    hideErrorMessage,
    hideLengthCounter,
    className,
    maxRows = 20,
    minRows = 1,
    ...props
  }: Props & Omit<TextareaAutosizeProps, "ref">,
  ref: TextareaAutosizeProps["ref"]
) => {
  const [length, setLength] = useState(0);

  return (
    <FormGroup
      label={label}
      controlName={props.name}
      errorMessage={hideErrorMessage ? undefined : error?.message}
      className={className}
      bottomInfo={
        typeof maxLength === "number" &&
        !hideLengthCounter && (
          <span className={`ml-auto whitespace-nowrap ${length > maxLength ? "text-red" : "text-gray"}`}>
            {length} / {maxLength}
          </span>
        )
      }
    >
      <TextareaAutosize
        {...props}
        onChange={(event) => {
          props.onChange?.(event);
          setLength(event.target.value.length);
        }}
        ref={ref}
        maxLength={maxLength}
        maxRows={maxRows}
        minRows={minRows}
        className={classNames("hassu-input", error && "error")}
      />
    </FormGroup>
  );
};

export default React.forwardRef(Textarea);
