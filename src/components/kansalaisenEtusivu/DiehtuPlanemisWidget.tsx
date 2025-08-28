import React, { ComponentProps } from "react";
import styles from "@styles/kansalaisenEtusivu/EtusivuJulkinenSideNavigation.module.css";
import Section from "@components/layout/Section2";
import SectionContent from "@components/layout/SectionContent";
import { styled } from "@mui/material";
import StyledLink from "@components/StyledLink";

const DiehtuPlanemisWidget = styled((props) => {
  const Img = styled("img")({});
  return (
    <Section sx={{ boxShadow: 1 }} noDivider {...props}>
      <div role="navigation" className={styles["side-nav"]}>
        <div
          className="flex justify-left"
          style={{
            height: "60px",
            backgroundColor: "#0064AF",
            color: "white",
            alignItems: "center",
            fontWeight: "700",
            paddingLeft: 24,
          }}
        >
          <h4 className="widget-title mb-0">Diehtu plánemis</h4>
        </div>

        <SectionContent className={styles["side-nav-content"]}>
          <Img src="/assets/saamen_lippu.svg" alt="Saamen lippu" sx={{ maxHeight: "91px" }} />
          {"Oahpásmuva geaidno- ja raŧŧeplánaid plánenprosessii ja riikkavuložiid váikkuhanvejolašvuođaide "}
          <StyledLink sx={{ fontWeight: "bold" }} href="/tietoa-palvelusta/diehtu-planemis">
            davvisámegillii
          </StyledLink>
          .
        </SectionContent>
      </div>
    </Section>
  );
})<ComponentProps<typeof Section>>({});

export default DiehtuPlanemisWidget;
