import { Box, styled, TextField, TextFieldProps } from "@mui/material";
import classNames from "classnames";
import React, { ReactNode, useMemo } from "react";
import { FieldValues, UseControllerProps, useController } from "react-hook-form";

const getDefaultMaxLength = (isMultiline: boolean | undefined) => (isMultiline ? 2000 : 200);

type TextFieldWithControllerProps<TFieldValues extends FieldValues> = TextFieldWithCounterProps & {
  controllerProps: UseControllerProps<TFieldValues> & { constructErrorMessage?: (message: string) => string | undefined };
};

type TextFieldWithCounterProps = Omit<TextFieldProps, "inputProps" | "value" | "onChange" | "name" | "onBlur" | "error" | "helperText"> & {
  inputProps?: TextFieldProps["inputProps"] & { maxLength?: number };
} & { showCounter?: boolean };

export const TextFieldWithController = <TFieldValues extends FieldValues>({
  controllerProps: { constructErrorMessage, ...controllerProps },
  inputProps,
  showCounter,
  ...textFieldProps
}: TextFieldWithControllerProps<TFieldValues>) => {
  const {
    field: { ref, ...field },
    fieldState,
  } = useController(controllerProps);

  const maxLength = useMemo(
    () => inputProps?.maxLength ?? getDefaultMaxLength(textFieldProps.multiline),
    [inputProps?.maxLength, textFieldProps.multiline]
  );

  const helperText: ReactNode | undefined = useMemo(() => {
    const text =
      constructErrorMessage && fieldState.error?.message ? constructErrorMessage(fieldState.error.message) : fieldState.error?.message;
    if (!showCounter) {
      return text;
    } else {
      return (
        <HelperTextContainer component="span">
          <HelperText>{text}</HelperText>
          <Counter className={classNames("MuiFormHelperText-counter", fieldState.error?.message && "Mui-error")}>{`${
            (field.value as string).length
          } / ${maxLength}`}</Counter>
        </HelperTextContainer>
      );
    }
  }, [constructErrorMessage, field.value, fieldState.error?.message, maxLength, showCounter]);

  const inputPrps = useMemo(() => ({ ref, maxLength, ...inputProps }), [inputProps, maxLength, ref]);

  return <TextField {...field} {...textFieldProps} inputProps={inputPrps} error={!!fieldState.error?.message} helperText={helperText} />;
};

const HelperTextContainer = styled(Box)({
  display: "grid",
  gridTemplateColumns: "2, 1fr",
  justifyItems: "center",
  alignItems: "start",
  gap: "1rem",
});

const HelperText = styled("span")({
  justifySelf: "start",
});

const Counter = styled("span")({
  "&:not(.Mui-error)": {
    color: "#A4A4A4",
  },
  fontSize: "1rem",
  justifySelf: "end",
  gridColumnStart: 2,
});
