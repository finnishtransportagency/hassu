import { HassuDatePicker } from "@components/form/HassuDatePicker";
import { TextField } from "@mui/material";
import dayjs, { Dayjs } from "dayjs";

interface TiedoteDatePickerProps {
  field: string;
  value: string;
  onChange: (field: string, value: string | null) => void;
  label: string;
  required?: boolean;
  minDate?: Dayjs;
  [key: string]: any;
}

const TiedoteDatePicker = ({
  field,
  value,
  onChange,
  label,
  required = false,
  minDate,
  error,
  helperText,
  renderInput,
  ...otherProps
}: TiedoteDatePickerProps) => {
  const dayjsValue: Dayjs | null = value ? dayjs(value) : null;

  const handleDateChange = (date: Dayjs | null) => {
    let dateStr: string | null = null;

    if (date !== null) {
      if (field === "voimassaAlkaen") {
        dateStr = dayjs(date).format("YYYY-MM-DD") + "T00:00:00";
      } else if (field === "voimassaPaattyen") {
        dateStr = dayjs(date).format("YYYY-MM-DD") + "T23:59:59";
      }
    }

    onChange(field, dateStr);
  };

  const customRenderInput = (params: any) => {
    return (
      <TextField
        {...params}
        error={error}
        helperText={helperText}
        required={required}
        variant="outlined"
        size="small"
        fullWidth
        label={label}
      />
    );
  };

  return (
    <HassuDatePicker
      value={dayjsValue}
      onChange={handleDateChange}
      label={label}
      minDate={minDate}
      textFieldProps={{ required }}
      renderInput={customRenderInput}
      {...otherProps}
    />
  );
};

export default TiedoteDatePicker;
