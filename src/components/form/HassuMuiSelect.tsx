import React, { ReactNode } from "react";
import { capitalize, FormControl, InputLabel, MenuItem, Select, SelectProps } from "@mui/material";
import { Controller, FieldError } from "react-hook-form";
import useTranslation from "next-translate/useTranslation";
import FormGroup from "./FormGroup";

type Props = {
  name: string;
  label: string;
  control: any;
  defaultValue: string;
  children: ReactNode;
  disabled?: boolean;
  error?: FieldError;
} & Pick<SelectProps<string>, "onChange">;

const HassuMuiSelect = (
  { name, label, control, defaultValue, children, disabled, error, onChange: onChangeProp, ...props }: Props,
  ref: React.ForwardedRef<HTMLSelectElement>
) => {
  const { t } = useTranslation("common");
  const labelId = `${name}-label`;
  return (
    <FormGroup errorMessage={error?.message}>
      <FormControl sx={{ paddingTop: "3px" }} {...props}>
        <InputLabel id={labelId} htmlFor={name}>
          {capitalize(label)}
        </InputLabel>
        <Controller
          render={({ field: { onChange, onBlur, value } }) => (
            <Select<string>
              MenuProps={{ sx: { maxHeight: 750 } }}
              labelId={labelId}
              label={label}
              onChange={(...args) => {
                onChange(...args);
                onChangeProp?.(...args);
              }}
              name={name}
              onBlur={onBlur}
              value={value === null ? "" : value}
              ref={ref}
              disabled={disabled}
            >
              <MenuItem value="">{t("valitse")}</MenuItem>
              {children}
            </Select>
          )}
          name={name}
          control={control}
          defaultValue={defaultValue}
        />
      </FormControl>
    </FormGroup>
  );
};

export default React.forwardRef(HassuMuiSelect);
