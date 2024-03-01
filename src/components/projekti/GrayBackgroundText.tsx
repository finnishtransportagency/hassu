import { styled } from "@mui/material";

export const GrayBackgroundText = styled("div")(({ theme }) => ({
  background: "#EFF0F1",
  padding: `${theme.spacing(4)} ${theme.spacing(5)}`,
  "& p": {
    margin: 0,
  },
}));
