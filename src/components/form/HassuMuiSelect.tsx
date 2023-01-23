import React, { ReactElement } from "react";
import { FormControl, InputBase, InputLabel, styled } from "@mui/material";

interface Props {
  label: string;
  labelid: string;
  select: ReactElement;
  variant?: "filled" | "standard" | "outlined" | undefined;
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

const HassuMuiSelect = ({ label, labelid, select, variant = "outlined" }: Props) => {
  return (
    <FormControl variant={variant} sx={{ paddingTop: "3px" }}>
      <InputLabel id={labelid}>{label}</InputLabel>
      {select}
    </FormControl>
  );
};

export default React.forwardRef(HassuMuiSelect);
