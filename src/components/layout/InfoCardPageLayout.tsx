import React, { ReactNode } from "react";
import { styled } from "@mui/material";

const Background = styled("div")(({ theme }) => ({
  backgroundImage: "url(/huoltokatko/assets/rata_ja_tie_background.jpeg)",
  position: "relative",
  "::after": {
    content: "''",
    top: 0,
    right: 0,
    left: 0,
    bottom: 0,
    background: "RGBA(255, 255, 255, 0.8)",
    position: "absolute",
    zIndex: 0,
  },
  padding: theme.spacing(4),
  justifyContent: "center",
  alignContent: "center",
  height: "fit-content",
  minHeight: "100%",
  display: "flex",
  backgroundSize: "cover",
  backgroundAttachment: "fixed",
  backgroundRepeat: "no-repeat",
}));

export default function RakenteillaSivu(props: { children?: ReactNode }) {
  return (
    <Background>
      <TextContainer>{props.children}</TextContainer>
    </Background>
  );
}

const TextContainer = styled("div")(({ theme }) => ({
  background: "white",
  display: "inline-block",
  alignSelf: "center",
  maxWidth: theme.spacing(218.5),
  paddingLeft: theme.spacing(4),
  paddingRight: theme.spacing(4),
  paddingTop: theme.spacing(8),
  paddingBottom: theme.spacing(8),
  zIndex: 1,
  [theme.breakpoints.up("md")]: {
    paddingLeft: theme.spacing(27.5),
    paddingRight: theme.spacing(27.5),
    paddingTop: theme.spacing(22),
    paddingBottom: theme.spacing(13.5),
  },
  textAlign: "center",
}));
