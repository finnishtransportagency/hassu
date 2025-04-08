import React, { ComponentProps } from "react";
import Section from "@components/layout/Section";
import { styled } from "@mui/material";
import DiehtuPlanemisWidget from "@components/kansalaisenEtusivu/DiehtuPlanemisWidget";
import useKansalaiskieli from "../../hooks/useKansalaiskieli";
import { Kieli } from "hassu-common/graphql/apiModel";
import TietoaSuunnittelustaWidget from "./TietoaSuunnittelustaWidget";
import TutustuVaylavirastoonJaElyynWidget from "./TutustuVaylavirastoonJaElyynWidget";
import { KansalaisilleSuunnattuKyselyWidget } from "./KansalaisilleSuunnattuKyselyWidget";
import { haehardCodedPalauteKyselyTiedot, PalauteKyselyAvoinna } from "src/util/haePalauteKyselyTiedot";

const EtusivuSideNavigation = styled((props) => {
  const kieli = useKansalaiskieli();
  const kyselyTiedot: PalauteKyselyAvoinna = haehardCodedPalauteKyselyTiedot();

  return (
    <Section noDivider {...props}>
      <TietoaSuunnittelustaWidget />
      {kyselyTiedot.isActive && <KansalaisilleSuunnattuKyselyWidget href={kyselyTiedot.href} />}
      {kieli === Kieli.SUOMI ? <DiehtuPlanemisWidget /> : null}
      <TutustuVaylavirastoonJaElyynWidget />
    </Section>
  );
})<ComponentProps<typeof Section>>({});

export default EtusivuSideNavigation;
