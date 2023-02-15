import React, { ReactNode } from "react";
import { styled } from "@mui/material";

const Background = styled("div")({
  backgroundImage: "url('rata_ja_tie_background.jpeg')",
  height: "100%",
  backgroundSize: "cover",
  backgroundRepeat: "no-repeat",
});

const BackgroundOverlay = styled("div")(({ theme }) => ({
  background: "RGBA(255, 255, 255, 0.8)",
  display: "flex",
  padding: theme.spacing(4),
  height: "100%",
  alignItems: "center",
  justifyContent: "center",
}));

export default function RakenteillaSivu(props: { children?: ReactNode }) {
  return (
    <Background>
      <BackgroundOverlay>
        <TextContainer>{props.children}</TextContainer>
      </BackgroundOverlay>
    </Background>
  );
}

const TextContainer = styled("div")(({ theme }) => ({
  background: "white",
  display: "inline-block",
  maxWidth: theme.spacing(218.5),
  paddingLeft: theme.spacing(4),
  paddingRight: theme.spacing(4),
  paddingTop: theme.spacing(8),
  paddingBottom: theme.spacing(8),
  [theme.breakpoints.up("md")]: {
    paddingLeft: theme.spacing(27.5),
    paddingRight: theme.spacing(27.5),
    paddingTop: theme.spacing(22),
    paddingBottom: theme.spacing(13.5),
  },
  textAlign: "center",
}));
