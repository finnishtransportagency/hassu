import React, { ReactElement } from "react";
import { capitalize, FormControl, InputBase, InputLabel, MenuItem, Select, SelectProps, styled } from "@mui/material";
import { Controller, FieldError } from "react-hook-form";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import useTranslation from "next-translate/useTranslation";
import classNames from "classnames";
import FormGroup from "./FormGroup";

type Props = {
  name: string;
  label: string;
  control: any;
  defaultValue: string;
  children: ReactElement[];
  disabled?: boolean;
  error?: FieldError;
} & Pick<SelectProps<string>, "onChange">;

export const HassuSelectInput = styled(InputBase)(({ theme }) => ({
  "label + &": {
    marginTop: "0px",
  },
  "& .MuiInputBase-input": {
    borderRadius: 1,
    position: "relative",
    backgroundColor: theme.palette.background.paper,
    border: "1px solid #333333",
    fontSize: "1rem",
    padding: "10px 26px 10px 12px",
    transition: theme.transitions.create(["border-color", "box-shadow"], { delay: 0, duration: 0 }),
    "&:focus": {
      borderRadius: 1,
      borderColor: "rgb(0 153 255)",
      boxShadow: "inset rgb(0 0 0 / 10%) 0px 0px 2px 0px, inset rgb(0 0 0 / 10%) 0px 2px 4px 0px;",
    },
  },
  "&.error": {
    "& .MuiInputBase-input": {
      borderColor: "red",
    },
  },
}));

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
            <>
              <Select<string>
                MenuProps={{ sx: { maxHeight: 750 } }}
                className={classNames("w-100", error && "error")}
                displayEmpty
                IconComponent={KeyboardArrowDownIcon}
                input={<HassuSelectInput id={name} />}
                labelId={labelId}
                label={label}
                onChange={(...args) => {
                  onChange(...args);
                  onChangeProp?.(...args);
                }}
                onBlur={onBlur}
                value={value === null ? "" : value}
                ref={ref}
                disabled={disabled}
              >
                <MenuItem value="">{t("valitse")}</MenuItem>
                {children}
              </Select>
            </>
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
