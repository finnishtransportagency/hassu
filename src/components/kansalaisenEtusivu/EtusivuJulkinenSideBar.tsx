import React, { ComponentProps } from "react";
import Section from "@components/layout/Section";
import { styled } from "@mui/material";
import DiehtuPlanemisWidget from "@components/kansalaisenEtusivu/DiehtuPlanemisWidget";
import useKansalaiskieli from "../../hooks/useKansalaiskieli";
import { Kieli } from "../../../common/graphql/apiModel";

const EtusivuSideNavigation = styled((props) => {
  const kieli = useKansalaiskieli();
  return (
    <Section noDivider {...props}>
      {kieli === Kieli.SUOMI ? <DiehtuPlanemisWidget /> : null}
    </Section>
  );
})<ComponentProps<typeof Section>>({});

export default EtusivuSideNavigation;
