import useTranslation from "next-translate/useTranslation";
import React from "react";
import Widget from "./Widget";
import ButtonLink, { ButtonLinkProps } from "@components/button/ButtonLink";
import { styled, experimental_sx as sx } from "@mui/material";

export type KansalaisilleSuunnattuKyselyWidgetProps = {
  href: string | undefined
}

function KansalaisilleSuunnattuKyselyWidget({href}: KansalaisilleSuunnattuKyselyWidgetProps) {
  const { t, lang } = useTranslation("main-page-sidebar");
  return (
    <React.Fragment>
      <Widget title={t("widgetit.kerro-kayttokokemuksestasi")}>
        <p>{t("widgetit.kerro-kayttokokemuksestasi-vastaa-kyselyyn")}</p>
        <p>{t("widgetit.kerro-kayttokokemuksestasi-saatu-palaute")}</p>
        <ResponsiveButtonLink
          lang={lang}
          href={href}
          target="_blank"
          endIcon="external-link-alt"
          className="mt-8 mb-4"
        >
          {t("widgetit.kerro-kayttokokemuksestasi-linkki")}
        </ResponsiveButtonLink>
      </Widget>
    </React.Fragment>
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

export { KansalaisilleSuunnattuKyselyWidget };
