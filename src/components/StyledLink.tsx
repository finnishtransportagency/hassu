import { styled } from "@mui/material";
import HassuLink from "./HassuLink";

export default styled(HassuLink)((props) => ({
  display: "inline-block",
  "&:hover": {
    textDecoration: "underline",
    cursor: "pointer",
  },
  color: props.theme.palette.primary.dark,
}));
