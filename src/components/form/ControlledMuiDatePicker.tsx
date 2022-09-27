import React from "react";
import { DatePicker as MuiDatePicker, DatePickerProps } from "@mui/x-date-pickers/DatePicker";
import { DialogActions, TextField } from "@mui/material";
import dayjs, { Dayjs } from "dayjs";
import { FieldValues, useController, UseControllerProps } from "react-hook-form";
import { PickersActionBarProps } from "@mui/x-date-pickers/PickersActionBar";
import useTranslation from "next-translate/useTranslation";
import Button from "@components/button/Button";

type InputDate = Dayjs | null;
type OutputDate = Dayjs | null;

type PartialDatePickerProps = Partial<Omit<DatePickerProps<InputDate, OutputDate>, "value" | "onChange">>;

type Props<TFieldValues> = {
  datePickerProps?: PartialDatePickerProps;
} & UseControllerProps<TFieldValues>;

const ControlledMuiDatePicker = <TFieldValues extends FieldValues>({
  datePickerProps = {},
  ...useControllerProps
}: Props<TFieldValues>) => {
  const {
    field: { onChange, onBlur, name, value, ref },
    fieldState,
  } = useController(useControllerProps);
  const dayjsValue: Dayjs | null = value === null ? null : dayjs(value);

  return (
    <MuiDatePicker<InputDate, OutputDate>
      value={dayjsValue}
      onChange={(date) => {
        const dateStr: null | string = date === null ? null : dayjs(date).format("YYYY-MM-DD");
        onChange(dateStr);
      }}
      minDate={dayjs("2000-01-01")}
      maxDate={dayjs("2099-01-01").endOf("year")}
      renderInput={({ error, helperText, ...params }) => (
        <TextField
          {...params}
          name={name}
          onBlur={onBlur}
          ref={ref}
          error={error || !!fieldState.error}
          helperText={helperText || fieldState.error?.message}
        />
      )}
      components={{
        ActionBar: CustomActionBar,
      }}
      componentsProps={{}}
      DialogProps={{
        sx: {
          "& .MuiDialogContent-root": {
            marginBottom: 0,
          },
        },
      }}
      {...datePickerProps}
    />
  );
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

export default ControlledMuiDatePicker;
