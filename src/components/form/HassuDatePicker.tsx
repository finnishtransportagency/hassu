import React from "react";
import { DatePicker as MuiDatePicker, DatePickerProps } from "@mui/x-date-pickers/DatePicker";
import { DialogActions, TextField, TextFieldProps } from "@mui/material";
import dayjs, { Dayjs } from "dayjs";
import { FieldValues, useController, UseControllerProps } from "react-hook-form";
import { PickersActionBarProps } from "@mui/x-date-pickers/PickersActionBar";
import useTranslation from "next-translate/useTranslation";
import Button from "@components/button/Button";

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
    DialogProps: {
      sx: {
        "& .MuiDialogContent-root": {
          marginBottom: 0,
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

const CustomActionBar = ({ onAccept, onCancel }: PickersActionBarProps) => {
  const { t } = useTranslation("common");
  return (
    <DialogActions sx={{ flexDirection: { xs: "row" }, padding: 2 }}>
      <Button type="button" primary onClick={onAccept}>
        {t("OK")}
      </Button>
      <Button type="button" onClick={onCancel}>
        {t("peruuta")}
      </Button>
    </DialogActions>
  );
};
