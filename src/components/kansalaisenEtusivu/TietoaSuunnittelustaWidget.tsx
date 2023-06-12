import React from "react";
import Widget from "./Widget";
import useTranslation from "next-translate/useTranslation";
import ButtonLink, { ButtonLinkProps } from "@components/button/ButtonLink";
import { styled, experimental_sx as sx } from "@mui/material";

const ResponsiveButtonLink = styled(ButtonLink)((props: ButtonLinkProps & { lang?: string }) => {
  return sx({
    whiteSpace: "nowrap",
    fontSize: props.lang == "fi" ? { lg: "medium!important", xl: "normal!important" } : { lg: "small!important", xl: "medium!important" },
  });
});

function TietoaSuunnittelustaWidget() {
  const { t, lang } = useTranslation("main-page-sidebar");
  return (
    <React.Fragment>
      <img src="/rata_ja_tie_background.jpeg" alt="Kuva rautatiestä" />
      <Widget title={t("widgetit.tietoa-suunnittelusta")}>
        {t("widgetit.tutustu-hankesuunnittelun")}
        <ResponsiveButtonLink lang={lang} href="/tietoa-palvelusta/tietoa-suunnittelusta" className="mt-8 mb-4">
          {t("widgetit.tutustu-suunnitteluun")}
        </ResponsiveButtonLink>
      </Widget>
    </React.Fragment>
  );
}

export default TietoaSuunnittelustaWidget;
