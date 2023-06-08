import React from "react";
import styles from "@styles/kansalaisenEtusivu/EtusivuJulkinenSideNavigation.module.css";
import SectionContent from "@components/layout/SectionContent";
import { styled } from "@mui/material";
import Button from "@components/button/Button";
import HassuLink from "@components/HassuLink";
import Widget from "./Widget";

const WidgetOtsikko = styled("h3")(() => ({
  fontWeight: "bold",
  fontSize: 20,
  "::after": {
    content: '""',
    marginTop: 10,
    display: "block",
    width: 60,
    height: 5,
    backgroundColor: "red",
    opacity: "80%",
    marginBottom: 20,
  },
}));

const TietoaSuunnittelustaWidget = () => {
  return (
    <React.Fragment>
      <img src="/rata_ja_tie_background.jpeg" alt="Kuva rautatiestä" />
      <Widget>
        <div role="navigation" className={styles["side-nav"]}>
          <SectionContent className={styles["side-nav-content"]}>
            <WidgetOtsikko>Tietoa suunnittelusta</WidgetOtsikko>
            Tutustu hankesuunnittelun ja kansalaisen osallistumismahdollisuuksiin hankkeen suunnittelun aikana.
            <HassuLink href="/tietoa-palvelusta/tietoa-suunnittelusta">
              <Button className="mt-8 mb-4" style={{ whiteSpace: "nowrap" }}>
                Tutustu suunnitteluun
              </Button>
            </HassuLink>
          </SectionContent>
          <div className="pb-2" style={{ background: "linear-gradient(117deg, #009ae0, #49c2f1)" }} />
        </div>
      </Widget>
    </React.Fragment>
  );
};

export default TietoaSuunnittelustaWidget;
