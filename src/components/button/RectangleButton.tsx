import { focusStyleSecondary } from "@components/layout/HassuMuiThemeProvider";
import { styled } from "@mui/system";

export const RectangleButton = styled("button")({
  "button&": {
    backgroundColor: "#0064AF",
    color: "#FFFFFF",
    fontWeight: 700,
    padding: "4px 12px",
    overflowWrap: "anywhere",
    hyphens: "auto",
    "&:focus": focusStyleSecondary,
    "&:disabled": {
      border: "1px solid #999999",
      color: "#242222",
      backgroundColor: "#E5E5E5",
    },
  },
});
