import React, { ComponentProps } from "react";
import Section from "@components/layout/Section";
import { styled } from "@mui/material";
import DiehtuPlanemisWidget from "@components/kansalaisenEtusivu/DiehtuPlanemisWidget";
import useKansalaiskieli from "../../hooks/useKansalaiskieli";
import { Kieli } from "hassu-common/graphql/apiModel";
import TietoaSuunnittelustaWidget from "./TietoaSuunnittelustaWidget";
import TutustuVaylavirastoonJaElyynWidget from "./TutustuVaylavirastoonJaElyynWidget";
import { KansalaisilleSuunnattuKyselyWidget } from "./KansalaisilleSuunnattuKyselyWidget";
import isPalauteKyselyAvoinna from "src/util/isPalauteKyselyAvoinna";

const EtusivuSideNavigation = styled((props) => {
  const kieli = useKansalaiskieli();
  const kyselyIsActive = isPalauteKyselyAvoinna();

  return (
    <Section noDivider {...props}>
      <TietoaSuunnittelustaWidget />
      {kyselyIsActive && <KansalaisilleSuunnattuKyselyWidget />}
      {kieli === Kieli.SUOMI ? <DiehtuPlanemisWidget /> : null}
      <TutustuVaylavirastoonJaElyynWidget />
    </Section>
  );
})<ComponentProps<typeof Section>>({});

export default EtusivuSideNavigation;
