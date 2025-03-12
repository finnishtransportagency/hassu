import { styled } from "@mui/material";

export const SideCard = styled("div")(() => ({
  backgroundColor: "#F8F8F8",
}));
export const SideCardHeading = styled("h4")(() => ({
  paddingTop: "18px",
  paddingBottom: "18px",
  paddingLeft: "13px",
  paddingRight: "13px",
  backgroundColor: "#0064AF",
  color: "white",
  fontWeight: "700",
  marginBottom: 0,
}));
export const SideCardContent = styled("div")(({ theme }) => ({
  padding: theme.spacing(10),
}));
export const VideoWrapper = styled("div")(() => ({
  position: "relative",
  overflow: "hidden",
  width: "100%",
  paddingTop: "56.25%",
}));
export const VideoIframe = styled("iframe")(() => ({
  position: "absolute",
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
  width: "100%",
  height: "100%",
  border: "none",
}));
