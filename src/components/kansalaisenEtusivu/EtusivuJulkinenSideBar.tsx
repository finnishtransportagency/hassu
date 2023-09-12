import React, { ComponentProps } from "react";
import Section from "@components/layout/Section";
import { styled } from "@mui/material";
import DiehtuPlanemisWidget from "@components/kansalaisenEtusivu/DiehtuPlanemisWidget";
import useKansalaiskieli from "../../hooks/useKansalaiskieli";
import { Kieli } from "hassu-common/graphql/apiModel";
import TietoaSuunnittelustaWidget from "./TietoaSuunnittelustaWidget";
import TutustuVaylavirastoonJaElyynWidget from "./TutustuVaylavirastoonJaElyynWidget";

const EtusivuSideNavigation = styled((props) => {
  const kieli = useKansalaiskieli();
  return (
    <Section noDivider {...props}>
      <TietoaSuunnittelustaWidget />
      {kieli === Kieli.SUOMI ? <DiehtuPlanemisWidget /> : null}
      <TutustuVaylavirastoonJaElyynWidget />
    </Section>
  );
})<ComponentProps<typeof Section>>({});

export default EtusivuSideNavigation;
