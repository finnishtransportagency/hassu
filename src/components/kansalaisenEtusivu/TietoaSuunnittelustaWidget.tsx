import React from "react";
import Button from "@components/button/Button";
import HassuLink from "@components/HassuLink";
import Widget from "./Widget";
import useTranslation from "next-translate/useTranslation";

function TietoaSuunnittelustaWidget() {
  const { t, lang } = useTranslation("main-page-sidebar");
  return (
    <React.Fragment>
      <img src="/rata_ja_tie_background.jpeg" alt="Kuva rautatiestä" />
      <Widget title={t("widgetit.tietoa-suunnittelusta")}>
        {t("widgetit.tutustu-hankesuunnittelun")}
        <HassuLink href="/tietoa-palvelusta/tietoa-suunnittelusta">
          <Button className="mt-8 mb-4" style={lang == "fi" ? { whiteSpace: "nowrap" } : { whiteSpace: "nowrap", fontSize: "medium" }}>
            {t("widgetit.tutustu-suunnitteluun")}
          </Button>
        </HassuLink>
      </Widget>
    </React.Fragment>
  );
}

export default TietoaSuunnittelustaWidget;
