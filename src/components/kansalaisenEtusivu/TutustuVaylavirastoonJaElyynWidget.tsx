import React from "react";
import styles from "@styles/kansalaisenEtusivu/EtusivuJulkinenSideNavigation.module.css";
import Section from "@components/layout/Section2";
import SectionContent from "@components/layout/SectionContent";
import ButtonLink from "@components/button/ButtonLink";
import useTranslation from "next-translate/useTranslation";

function TutustuVaylavirastoonJaElyynWidget() {
  const { t, lang } = useTranslation("main-page-sidebar");

  return (
    <Section
      sx={{ boxShadow: 1 }}
      noDivider
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
            {t("widgetit.tutustu-vaylaan-elyyn")}
          </h3>
          <p className="mt-4 mb-8">{t("widgetit.tietoa-vaylasta-elysta")}</p>
          <ButtonLink
            external
            primary
            href={lang == "fi" ? "http://vayla.fi" : "https://vayla.fi/sv/framsida"}
            style={{ marginLeft: "auto", marginRight: "auto" }}
            target="_blank"
          >
            {t("widgetit.vaylavirasto")}
          </ButtonLink>
          <ButtonLink
            external
            primary
            href={lang == "fi" ? "http://ely-keskus.fi" : "https://www.ely-keskus.fi/sv/etusivu"}
            style={{ marginLeft: "auto", marginRight: "auto" }}
            target="_blank"
          >
            {t("widgetit.ely-keskus")}
          </ButtonLink>
        </SectionContent>
      </div>
    </Section>
  );
}

export default TutustuVaylavirastoonJaElyynWidget;
