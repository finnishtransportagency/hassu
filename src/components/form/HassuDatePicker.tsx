import React from "react";
import { DatePicker as MuiDatePicker, DatePickerProps } from "@mui/x-date-pickers/DatePicker";
import { DialogActions, TextField, TextFieldProps } from "@mui/material";
import dayjs, { Dayjs } from "dayjs";
import { FieldValues, useController, UseControllerProps } from "react-hook-form";
import { PickersActionBarProps } from "@mui/x-date-pickers/PickersActionBar";
import Button from "@components/button/Button";
import { PickersActionBarAction } from "@mui/x-date-pickers/PickersActionBar/PickersActionBar";
import { useLocaleText, WrapperVariantContext } from "@mui/x-date-pickers/internals";

type InputDate = Dayjs | null;
type OutputDate = Dayjs | null;

type HassuDatePickerProps = {
  textFieldProps?: Partial<TextFieldProps>;
} & Partial<DatePickerProps<InputDate, OutputDate>>;

export const HassuDatePicker = React.forwardRef(function HassuDatePickerForwardRef(
  { textFieldProps = {}, value = null, onChange = () => {}, renderInput, ...datePickerProps }: HassuDatePickerProps,
  ref: React.ForwardedRef<HTMLInputElement>
) {
  const defaultRenderInput: DatePickerProps<InputDate, OutputDate>["renderInput"] = ({ error, helperText, inputProps = {}, ...params }) => {
    const props: TextFieldProps = {
      ...params,
      ...textFieldProps,
      error: error || textFieldProps.error,
      helperText: helperText || textFieldProps.helperText,
      inputProps: { ref, ...inputProps },
    };
    return <TextField {...props} />;
  };
  const props: DatePickerProps<InputDate, OutputDate> = {
    minDate: dayjs("2000-01-01"),
    maxDate: dayjs("2099-01-01").endOf("year"),
    value,
    onChange,
    renderInput: renderInput || defaultRenderInput,
    components: {
      ActionBar: CustomActionBar,
    },
    componentsProps: { actionBar: { sx: { padding: 14 } } },
    DialogProps: {
      sx: {
        "& .MuiDialogContent-root": {
          marginBottom: 0,
        },
        "& .MuiPickersToolbar-root": {
          paddingTop: 4,
          paddingBottom: 4,
          paddingRight: 6,
          paddingLeft: 6,
        },
      },
    },
    ...datePickerProps,
  };
  return <MuiDatePicker<InputDate, OutputDate> {...props} />;
});

export const HassuDatePickerWithController = <TFieldValues extends FieldValues>({
  controllerProps,
  textFieldProps,
  ...datePickerProps
}: Partial<HassuDatePickerProps> & { controllerProps: UseControllerProps<TFieldValues> }) => {
  const {
    field: { onChange, onBlur, name, value, ref },
    fieldState,
  } = useController(controllerProps);
  const dayjsValue: Dayjs | null = value === null ? null : dayjs(value);

  const controlledDatePickerProps: HassuDatePickerProps = {
    ...datePickerProps,
    value: dayjsValue,
    onChange: (date, keyboardValue) => {
      const dateStr: null | string = date === null ? null : dayjs(date).format("YYYY-MM-DD");
      onChange(dateStr);
      datePickerProps?.onChange?.(date, keyboardValue);
    },
    textFieldProps: { name, onBlur, error: !!fieldState.error, helperText: fieldState.error?.message, ...textFieldProps },
  };

  return <HassuDatePicker ref={ref} {...controlledDatePickerProps} />;
};

const CustomActionBar = (props: PickersActionBarProps) => {
  const wrapperVariant = React.useContext(WrapperVariantContext);
  const actionArray: PickersActionBarAction[] | undefined =
    typeof props.actions === "function" ? props.actions(wrapperVariant) : props.actions;
  const showOKButton = !!actionArray?.includes("accept");
  const showCancelButton = !!actionArray?.includes("cancel");
  const localeText = useLocaleText();
  localeText.okButtonLabel;

  if (!showCancelButton && !showOKButton) {
    return <></>;
  }

  return (
    <DialogActions sx={{ flexDirection: { xs: "row" }, padding: 2, paddingLeft: 4, paddingRight: 4, paddingBottom: 4 }}>
      {showOKButton && (
        <Button type="button" primary onClick={props.onAccept}>
          {localeText.okButtonLabel}
        </Button>
      )}
      {showCancelButton && (
        <Button type="button" onClick={props.onCancel}>
          {localeText.cancelButtonLabel}
        </Button>
      )}
    </DialogActions>
  );
};
