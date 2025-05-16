import React from "react";
import styles from "@styles/kansalaisenEtusivu/EtusivuJulkinenSideNavigation.module.css";
import Section from "@components/layout/Section2";
import SectionContent from "@components/layout/SectionContent";
import useTranslation from "next-translate/useTranslation";
import { styled, experimental_sx as sx } from "@mui/material";
import ButtonLink, { ButtonLinkProps } from "@components/button/ButtonLink";

const TutustuSection = styled(Section)(() => {
  return sx({
    backgroundImage: "url(assets/rata_ja_tie_background.jpeg)",
    paddingLeft: "1em",
    paddingRight: "1em",
    paddingTop: "1.5em",
    paddingBottom: "1.5em",
    boxShadow: 1,
  });
});

function TutustuVaylavirastoonJaElyynWidget() {
  const { t, lang } = useTranslation("main-page-sidebar");

  return (
    <TutustuSection noDivider>
      <div role="navigation" className={styles["side-nav"]}>
        <SectionContent className={styles["side-nav-content"]} style={{ textAlign: "center", backgroundColor: "white" }}>
          <h3 className="vayla-subtitle" style={{ color: "rgb(0, 100, 175)" }}>
            {t("widgetit.tutustu-vaylaan-elyyn")}
          </h3>
          <p className="mt-4 mb-8">{t("widgetit.tietoa-vaylasta-elysta")}</p>
          <ResponsiveButtonLink
            external
            primary
            href={lang == "fi" ? "https://vayla.fi" : "https://vayla.fi/sv/framsida"}
            style={{ marginLeft: "auto", marginRight: "auto" }}
            target="_blank"
          >
            {t("widgetit.vaylavirasto")}
          </ResponsiveButtonLink>
          <ResponsiveButtonLink
            external
            primary
            href={lang == "fi" ? "https://ely-keskus.fi" : "https://www.ely-keskus.fi/sv/etusivu"}
            style={{ marginLeft: "auto", marginRight: "auto" }}
            target="_blank"
          >
            {t("widgetit.ely-keskus")}
          </ResponsiveButtonLink>
        </SectionContent>
      </div>
    </TutustuSection>
  );
}

const ResponsiveButtonLink = styled(ButtonLink)((props: ButtonLinkProps & { lang?: string }) => {
  return sx({
    fontSize:
      props.lang == "fi"
        ? { lg: "medium!important", xl: "normal!important" }
        : { xs: "medium!important", sm: "small!important", md: "small!important", lg: "small!important", xl: "medium!important" },
  });
});

export default TutustuVaylavirastoonJaElyynWidget;
