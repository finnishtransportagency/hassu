import { styled } from "@mui/system";

export const GradientBorderButton = styled("button")({
  color: "#0064AF",
  backgroundColor: "#FFFFFF",
  fontWeight: 700,
  "&:disabled": {
    color: "#7A7A7A",
    borderColor: "#7A7A7A",
    borderImage: "none",
  },
  borderColor: "#0064AF",
  borderImage: "linear-gradient(117deg, #009ae0, #49c2f1) 2",
  borderWidth: "2px",
  paddingLeft: "8px",
  paddingRight: "8px",
  paddingTop: "4px",
  paddingBottom: "4px",
});

