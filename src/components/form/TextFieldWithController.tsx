import { TextField, TextFieldProps } from "@mui/material";
import React from "react";
import { FieldValues, UseControllerProps, useController } from "react-hook-form";

type TextFieldWithControllerProps<TFieldValues> = TextFieldProps & { controllerProps: UseControllerProps<TFieldValues> };

export const TextFieldWithController = <TFieldValues extends FieldValues>({
  controllerProps,
  inputProps = {},
  error,
  helperText,
  ...textFieldProps
}: TextFieldWithControllerProps<TFieldValues>) => {
  const {
    field: { ref, ...field },
    fieldState,
  } = useController(controllerProps);

  return (
    <TextField
      {...field}
      {...textFieldProps}
      inputProps={{ ref, ...inputProps }}
      error={error || !!fieldState.error?.message}
      helperText={helperText || fieldState.error?.message}
    />
  );
};
