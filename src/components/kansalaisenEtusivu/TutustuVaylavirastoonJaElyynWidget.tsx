import React, { ComponentProps } from "react";
import styles from "@styles/kansalaisenEtusivu/EtusivuJulkinenSideNavigation.module.css";
import Section from "@components/layout/Section2";
import SectionContent from "@components/layout/SectionContent";
import { styled } from "@mui/material";
import ButtonLink from "@components/button/ButtonLink";

const TutustuVaylavirastoonJaElyynWidget = styled((props) => {
  return (
    <Section
      sx={{ boxShadow: 1 }}
      noDivider
      {...props}
      style={{
        backgroundImage: "url(rata_ja_tie_background.jpeg)",
        paddingLeft: "1em",
        paddingRight: "1em",
        paddingTop: "1.5em",
        paddingBottom: "1.5em",
      }}
    >
      <div role="navigation" className={styles["side-nav"]}>
        <SectionContent className={styles["side-nav-content"]} style={{ textAlign: "center", backgroundColor: "white" }}>
          <h3 className="vayla-subtitle" style={{ color: "rgb(0, 100, 175)" }}>
            Tutustu Väylävirastoon ja ELY-keskukseen
          </h3>
          <p className="mt-4 mb-8">
            Väylävirasto vastaa valtion tieverkon, rautateiden ja vesiväylien kehittämisestä sekä kunnossapidosta. Se huolehtii myös
            liikenteen palvelutasosta sekä osallistuu liikenteen ja maankäytön yhteensovittamiseen. Elinkeino-, liikenne- ja
            ympäristökeskukset (ELY-keskus) huolehtivat alueensa tienpidon tehtävistä Väyläviraston ohjauksen mukaisesti. Sekä Väylävirasto
            että ELY-keskus tekevät väylähankkeiden suunnittelua.
          </p>
          <ButtonLink external primary href="http://vayla.fi" style={{ marginLeft: "auto", marginRight: "auto" }} target="_blank">
            Väylävirasto
          </ButtonLink>
          <ButtonLink external primary href="http://ely-keskus.fi" style={{ marginLeft: "auto", marginRight: "auto" }} target="_blank">
            ELY-keskus
          </ButtonLink>
        </SectionContent>
      </div>
    </Section>
  );
})<ComponentProps<typeof Section>>({});

export default TutustuVaylavirastoonJaElyynWidget;
