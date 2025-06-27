import { HassuDatePicker } from "@components/form/HassuDatePicker";
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

const TiedoteDatePicker = ({ field, value, onChange, label, required = false, minDate, ...otherProps }: TiedoteDatePickerProps) => {
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

  return (
    <HassuDatePicker
      value={dayjsValue}
      onChange={handleDateChange}
      label={label}
      minDate={minDate}
      textFieldProps={{ required }}
      {...otherProps}
    />
  );
};

export default TiedoteDatePicker;
