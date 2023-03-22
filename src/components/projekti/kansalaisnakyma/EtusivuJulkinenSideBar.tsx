import React, { ComponentProps } from "react";
import Section from "@components/layout/Section";
import { styled } from "@mui/material";
import DiehtuPlanemisWidget from "@components/projekti/kansalaisnakyma/DiehtuPlanemisWidget";

const EtusivuSideNavigation = styled(() => {
  return <DiehtuPlanemisWidget></DiehtuPlanemisWidget>;
})<ComponentProps<typeof Section>>({});

export default EtusivuSideNavigation;
