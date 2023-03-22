import React, { ComponentProps } from "react";
import Section from "@components/layout/Section";
import { styled } from "@mui/material";
import DiehtuPlanemisWidget from "@components/projekti/kansalaisnakyma/DiehtuPlanemisWidget";
import useKansalaiskieli from "../../../hooks/useKansalaiskieli";
import { Kieli } from "../../../../common/graphql/apiModel";

const EtusivuSideNavigation = styled(() => {
  const kieli = useKansalaiskieli();
  return kieli === Kieli.SUOMI ? <DiehtuPlanemisWidget></DiehtuPlanemisWidget> : null;
})<ComponentProps<typeof Section>>({});

export default EtusivuSideNavigation;
