import { styled, Button, IconButton } from "@mui/material";

export const SideVideoContainer = styled("div")(() => ({
  display: "flex",
  flexDirection: "column",
  width: "80%",
  margin: "0 auto",
  paddingTop: "30px",
  paddingBottom: "30px",
}));

export const DialogVideoContainer = styled("div")(() => ({
  display: "flex",
  flexDirection: "column",
  width: "100%",
  margin: 0,
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

export const ExpandButton = styled(Button)(() => ({
  position: "absolute",
  top: 3,
  right: 3,
  minWidth: "auto",
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  color: "white",
  "&:hover": {
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
}));

export const CloseIconButton = styled(IconButton)(() => ({
  position: "absolute",
  right: 0,
  top: -45,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  color: "white",
  "&:hover": {
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
}));
