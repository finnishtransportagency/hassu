import React, { ReactElement } from "react";
import { capitalize, FormControl, InputBase, InputLabel, MenuItem, Select, styled } from "@mui/material";
import { Controller } from "react-hook-form";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

interface Props {
  name: string;
  label: string;
  control: any;
  defaultValue: string;
  children: ReactElement[];
}

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
}));

const HassuMuiSelect = ({ name, label, control, defaultValue, children, ...props }: Props) => {
  const labelId = `${name}-label`;
  return (
    <FormControl sx={{ paddingTop: "3px" }} {...props}>
      <InputLabel id={labelId} htmlFor={name}>{capitalize(label)}</InputLabel>
      <Controller
        render={({ field: { onChange, onBlur, value, ref } }) => (
          <>
            <Select
              id={name}
              className="w-100"
              displayEmpty
              IconComponent={KeyboardArrowDownIcon}
              input={<HassuSelectInput />}
              labelId={labelId}
              label={label}
              onChange={onChange}
              onBlur={onBlur}
              value={value}
              ref={ref}
            >
              <MenuItem value="">Valitse</MenuItem>
              {children}
            </Select>
          </>
        )}
        name={name}
        control={control}
        defaultValue={defaultValue}
      />
    </FormControl>
  );
};

export default HassuMuiSelect;
