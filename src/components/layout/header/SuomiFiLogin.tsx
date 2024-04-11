import React from "react";
import useTranslation from "next-translate/useTranslation";
import { styled } from "@mui/system";
import { getSuomiFiAuthenticationURL, getSuomiFiLogoutURL } from "@services/userService";
import useSuomifiUser, { useRefreshToken } from "../../../hooks/useSuomifiUser";
import ButtonLink from "@components/button/ButtonLink";

const SuomiFiLogin = styled((props) => {
  const { t, lang } = useTranslation("common");
  const { data } = useSuomifiUser();
  const { data: refreshData } = useRefreshToken();
  if (data?.suomifiEnabled) {
    if (!data.tunnistautunut || refreshData?.status !== 200) {
      const suomiFiAuthenticationURL = getSuomiFiAuthenticationURL(lang === "sv" ? "sv#kirjautunut" : "#kirjautunut");
      if (!suomiFiAuthenticationURL) {
        return <></>;
      }
      return (
        <ButtonLink href={suomiFiAuthenticationURL} {...props}>
          {t("kirjaudu-palveluun")}
        </ButtonLink>
      );
    } else {
      const logoutURL = getSuomiFiLogoutURL();
      return <ButtonLink href={logoutURL}>{t("kirjaudu-ulos")}</ButtonLink>;
    }
  } else {
    return <></>;
  }
})(({ theme }) => ({
  color: theme.palette.primary.dark,
  "&:hover": {
    cursor: "pointer",
  },
}));

export default SuomiFiLogin;
