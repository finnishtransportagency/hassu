import React, { useEffect } from "react";
import useTranslation from "next-translate/useTranslation";
import { styled } from "@mui/system";
import { getSuomiFiAuthenticationURL, getSuomiFiLogoutURL } from "@services/userService";
import useSuomifiUser, { useRefreshToken } from "../../../hooks/useSuomifiUser";
import ButtonLink from "@components/button/ButtonLink";
type SuomiFiLoginComponentProps = {
  setSessioVanhentunut: (state: boolean) => void;
};

export function SuomiFiLoginComponent({ setSessioVanhentunut }: Readonly<SuomiFiLoginComponentProps>) {
  const { data } = useRefreshToken();
  useEffect(() => {
    if (data?.status === 401) {
      setSessioVanhentunut(true);
    }
  }, [data?.status, setSessioVanhentunut]);
  return <SuomiFiLogin status={data?.status} />;
}

type SuomiFiLoginProps = {
  status?: number;
};
const SuomiFiLogin = styled((props: SuomiFiLoginProps) => {
  const { t, lang } = useTranslation("common");
  const { data } = useSuomifiUser();
  if (data?.suomifiEnabled) {
    if (!data.tunnistautunut || props?.status !== 200) {
      const suomiFiAuthenticationURL = getSuomiFiAuthenticationURL(lang === "sv" ? "sv#kirjautunut" : "#kirjautunut");
      if (!suomiFiAuthenticationURL) {
        return <></>;
      }
      return (
        <ButtonLink href={suomiFiAuthenticationURL} useNextLink={false} {...props}>
          {t("kirjaudu-palveluun")}
        </ButtonLink>
      );
    } else {
      const logoutURL = getSuomiFiLogoutURL();
      return (
        <ButtonLink href={logoutURL} useNextLink={false}>
          {t("kirjaudu-ulos")}
        </ButtonLink>
      );
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
