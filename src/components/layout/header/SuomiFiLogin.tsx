import React from "react";
import useTranslation from "next-translate/useTranslation";
import { styled } from "@mui/system";
import { getSuomiFiAuthenticationURL, getSuomiFiLogoutURL } from "@services/userService";
import useSuomifiUser from "../../../hooks/useSuomifiUser";
import ButtonLink from "@components/button/ButtonLink";

const SuomiFiLogin = styled((props) => {
  const { t } = useTranslation("common");
  const { data } = useSuomifiUser();
  if (data?.suomifiEnabled) {
    if (!data.tunnistautunut) {
      const suomiFiAuthenticationURL = getSuomiFiAuthenticationURL();
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
