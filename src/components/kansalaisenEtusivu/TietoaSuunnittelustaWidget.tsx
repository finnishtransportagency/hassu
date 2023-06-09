import React from "react";
import Widget from "./Widget";
import useTranslation from "next-translate/useTranslation";
import ButtonLink from "@components/button/ButtonLink";

function TietoaSuunnittelustaWidget() {
  const { t, lang } = useTranslation("main-page-sidebar");
  return (
    <React.Fragment>
      <img src="/rata_ja_tie_background.jpeg" alt="Kuva rautatiestä" />
      <Widget title={t("widgetit.tietoa-suunnittelusta")}>
        {t("widgetit.tutustu-hankesuunnittelun")}
        <ButtonLink
          href="/tietoa-palvelusta/tietoa-suunnittelusta"
          className="mt-8 mb-4"
          style={lang == "fi" ? { whiteSpace: "nowrap" } : { whiteSpace: "nowrap", fontSize: "medium" }}
        >
          {t("widgetit.tutustu-suunnitteluun")}
        </ButtonLink>
      </Widget>
    </React.Fragment>
  );
}

export default TietoaSuunnittelustaWidget;
