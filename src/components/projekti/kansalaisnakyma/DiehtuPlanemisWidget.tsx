import React, { ComponentProps } from "react";
import styles from "@styles/projekti/ProjektiJulkinenSideNavigation.module.css";
import Section from "@components/layout/Section";
import SectionContent from "@components/layout/SectionContent";
import { styled } from "@mui/material";
import StyledLink from "@components/StyledLink";

const DiehtuPlanemisWidget = styled((props) => {
  const Img = styled("img")({});
  return (
    <Section noDivider {...props}>
      <div role="navigation" className={styles["side-nav"]}>
        <div
          className="flex justify-center"
          style={{
            height: "60px",
            backgroundColor: "#0064AF",
            color: "white",
            alignItems: "center",
            fontWeight: "700",
          }}
        >
          <h4 className="vayla-title-small mb-0">Diehtu plánemis</h4>
        </div>

        <SectionContent className={styles["side-nav-content"]}>
          <Img src="/saamen_lippu.svg" alt="Saamen lippu" sx={{ maxHeight: "91px" }} />
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
