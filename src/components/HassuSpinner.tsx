import { Backdrop, CircularProgress } from "@mui/material";
import React, { ReactElement } from "react";

interface Props {
    open: boolean
}

const HassuSpinner = (props:Props): ReactElement => {
  return (
    <div>
      <Backdrop
        sx={{ color: "#49C2F1", zIndex: (theme) => theme.zIndex.modal + 1 }}
        open={props.open}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
    </div>
  );
};

export default HassuSpinner;
